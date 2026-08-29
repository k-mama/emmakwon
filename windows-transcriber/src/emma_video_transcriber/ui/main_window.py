from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

from PySide6.QtCore import Qt, QSize, Slot
from PySide6.QtGui import QCloseEvent, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QSpacerItem,
    QVBoxLayout,
    QWidget,
)

from .bridge import UiEventBridge
from .models import ActiveJobSnapshot, STATUS_FAILED, STATUS_PAUSED, STATUS_QUEUED, STATUS_TRANSCRIBING, UiJob
from .theme import APP_QSS
from .widgets import ActiveJobPanel, QueueRow


class MainWindow(QMainWindow):
    """Presentation-only main window for EMMA VIDEO TRANSCRIBER.

    All long-running work belongs outside the Qt UI thread. The integration room
    wires a UiEventBridge to the queue/media/engine layers and publishes snapshots
    back to this window.
    """

    def __init__(self, bridge: UiEventBridge | None = None, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.bridge = bridge or UiEventBridge(self)
        self._jobs: list[UiJob] = []
        self._rows: dict[str, QueueRow] = {}
        self._is_running = False
        self._active_snapshot: ActiveJobSnapshot | None = None
        self._close_pending = False
        self._allow_close_once = False

        self.setWindowTitle("EMMA VIDEO TRANSCRIBER")
        self.setMinimumSize(QSize(980, 680))
        self.resize(1160, 760)
        self.setStyleSheet(APP_QSS)

        self._build_ui()
        self._connect_bridge()
        self._connect_shortcuts()
        self._refresh_actions()

    def _build_ui(self) -> None:
        root = QWidget()
        root.setObjectName("Root")
        self.setCentralWidget(root)

        page = QVBoxLayout(root)
        page.setContentsMargins(34, 28, 34, 28)
        page.setSpacing(18)

        header = QVBoxLayout()
        header.setSpacing(3)
        title = QLabel("EMMA VIDEO TRANSCRIBER")
        title.setObjectName("Title")
        subtitle = QLabel("Long videos in. Clean TXT files out. Everything stays on this PC.")
        subtitle.setObjectName("Subtitle")
        header.addWidget(title)
        header.addWidget(subtitle)
        page.addLayout(header)

        actions = QHBoxLayout()
        actions.setSpacing(10)
        self.add_button = QPushButton("ADD VIDEOS")
        self.add_button.setObjectName("Secondary")
        self.add_button.setToolTip("Choose one or more local video files (Ctrl+O)")
        self.add_button.clicked.connect(self._choose_videos)
        actions.addWidget(self.add_button)

        self.start_button = QPushButton("START TRANSCRIPTION")
        self.start_button.setObjectName("Primary")
        self.start_button.setToolTip("Start or resume the queue (Ctrl+Enter)")
        self.start_button.clicked.connect(self.bridge.request_start)
        actions.addWidget(self.start_button)

        actions.addSpacerItem(QSpacerItem(12, 1, QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum))

        self.open_output_button = QPushButton("OPEN OUTPUT FOLDER")
        self.open_output_button.setObjectName("Secondary")
        self.open_output_button.setToolTip("Open the folder containing transcripts (Ctrl+Shift+O)")
        self.open_output_button.clicked.connect(self.bridge.request_open_output_folder)
        actions.addWidget(self.open_output_button)
        page.addLayout(actions)

        content = QHBoxLayout()
        content.setSpacing(18)

        queue_card = QFrame()
        queue_card.setObjectName("Card")
        queue_layout = QVBoxLayout(queue_card)
        queue_layout.setContentsMargins(20, 18, 20, 18)
        queue_layout.setSpacing(8)

        queue_header = QHBoxLayout()
        queue_title = QLabel("QUEUE")
        queue_title.setObjectName("SectionTitle")
        self.queue_count = QLabel("0 videos")
        self.queue_count.setObjectName("Muted")
        queue_header.addWidget(queue_title)
        queue_header.addStretch(1)
        queue_header.addWidget(self.queue_count)
        queue_layout.addLayout(queue_header)

        self.empty_queue = QLabel("No videos yet. Add several at once and they will run one by one.")
        self.empty_queue.setObjectName("Muted")
        self.empty_queue.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_queue.setWordWrap(True)
        self.empty_queue.setMinimumHeight(160)
        queue_layout.addWidget(self.empty_queue)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.scroll_content = QWidget()
        self.scroll_layout = QVBoxLayout(self.scroll_content)
        self.scroll_layout.setContentsMargins(0, 0, 0, 0)
        self.scroll_layout.setSpacing(0)
        self.scroll_layout.addStretch(1)
        self.scroll.setWidget(self.scroll_content)
        self.scroll.hide()
        queue_layout.addWidget(self.scroll, 1)

        self.active_panel = ActiveJobPanel()
        content.addWidget(queue_card, 7)
        content.addWidget(self.active_panel, 4)
        page.addLayout(content, 1)

        self.footer = QLabel("Ready. Your original videos are never modified.")
        self.footer.setObjectName("Footer")
        page.addWidget(self.footer)

    def _connect_bridge(self) -> None:
        self.bridge.jobs_published.connect(self.set_jobs)
        self.bridge.job_published.connect(self.set_job)
        self.bridge.active_published.connect(self.set_active_snapshot)
        self.bridge.running_published.connect(self.set_running)
        self.bridge.status_message_published.connect(self.set_status_message)
        self.bridge.error_published.connect(self.show_error)
        self.bridge.safe_close_published.connect(self._finish_safe_close)

    def _connect_shortcuts(self) -> None:
        QShortcut(QKeySequence("Ctrl+O"), self, activated=self._choose_videos)
        QShortcut(QKeySequence("Ctrl+Return"), self, activated=self._start_from_shortcut)
        QShortcut(QKeySequence("Ctrl+Enter"), self, activated=self._start_from_shortcut)
        QShortcut(QKeySequence("Ctrl+Shift+O"), self, activated=self.bridge.request_open_output_folder)

    @Slot()
    def _choose_videos(self) -> None:
        selected, _ = QFileDialog.getOpenFileNames(
            self,
            "Add videos",
            "",
            "Videos (*.mp4 *.mkv *.mov *.avi *.m4v *.webm *.ts *.mts *.m2ts);;All files (*.*)",
        )
        if not selected:
            return
        self.set_status_message(f"Adding {len(selected)} selected video{'s' if len(selected) != 1 else ''}…")
        self.bridge.request_add_videos(Path(path) for path in selected)

    @Slot()
    def _start_from_shortcut(self) -> None:
        if self.start_button.isEnabled():
            self.bridge.request_start()

    @Slot(object)
    def set_jobs(self, jobs: Iterable[UiJob]) -> None:
        self._jobs = list(jobs)
        self._rebuild_queue()
        self._refresh_actions()

    @Slot(object)
    def set_job(self, job: UiJob) -> None:
        for index, existing in enumerate(self._jobs):
            if existing.job_id == job.job_id:
                self._jobs[index] = job
                break
        else:
            self._jobs.append(job)
        self._rebuild_queue()
        self._refresh_actions()

    @Slot(object)
    def set_active_snapshot(self, snapshot: ActiveJobSnapshot | None) -> None:
        self._active_snapshot = snapshot
        self.active_panel.set_snapshot(snapshot)

    @Slot(bool)
    def set_running(self, running: bool) -> None:
        self._is_running = bool(running)
        self._refresh_actions()
        if running:
            self.footer.setText("Transcribing in the background. You can minimize this window and keep using your PC.")
        elif not self._close_pending:
            self.footer.setText("Ready. Your original videos are never modified.")

    @Slot(str)
    def set_status_message(self, message: str) -> None:
        clean = message.strip()
        if clean:
            self.footer.setText(clean)

    @Slot(str)
    def show_error(self, message: str) -> None:
        clean = message.strip() or "An unexpected error occurred."
        self.footer.setText(clean)
        QMessageBox.warning(self, "EMMA VIDEO TRANSCRIBER", clean)

    def _rebuild_queue(self) -> None:
        while self.scroll_layout.count() > 1:
            item = self.scroll_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

        self._rows.clear()
        for position, job in enumerate(self._jobs, start=1):
            row = QueueRow(job, position)
            self._rows[job.job_id] = row
            self.scroll_layout.insertWidget(self.scroll_layout.count() - 1, row)

        count = len(self._jobs)
        self.queue_count.setText(f"{count} video{'s' if count != 1 else ''}")
        self.empty_queue.setVisible(count == 0)
        self.scroll.setVisible(count > 0)

        active = next((job for job in self._jobs if job.status == STATUS_TRANSCRIBING), None)
        if active is not None:
            if self._active_snapshot is None or self._active_snapshot.job_id != active.job_id:
                self.set_active_snapshot(ActiveJobSnapshot.from_job(active))
        elif not self._is_running:
            self.set_active_snapshot(None)

    def _refresh_actions(self) -> None:
        actionable = any(job.status in {STATUS_QUEUED, STATUS_PAUSED, STATUS_FAILED} for job in self._jobs)
        self.start_button.setEnabled(bool(self._jobs) and actionable and not self._is_running and not self._close_pending)
        self.start_button.setText("TRANSCRIBING…" if self._is_running else "START TRANSCRIPTION")
        self.add_button.setEnabled(not self._close_pending)
        self.open_output_button.setEnabled(not self._close_pending)

    def _has_active_work(self) -> bool:
        return self._is_running or any(job.status == STATUS_TRANSCRIBING for job in self._jobs)

    def closeEvent(self, event: QCloseEvent) -> None:
        if self._allow_close_once:
            self._allow_close_once = False
            event.accept()
            return

        if not self._has_active_work():
            event.accept()
            return

        dialog = QMessageBox(self)
        dialog.setWindowTitle("Transcription is still running")
        dialog.setIcon(QMessageBox.Icon.Question)
        dialog.setText("A video is still being transcribed.")
        dialog.setInformativeText("Choose what you want to do. Your current work will not be silently discarded.")

        keep_running = dialog.addButton("Keep running", QMessageBox.ButtonRole.ActionRole)
        pause_close = dialog.addButton("Pause and close", QMessageBox.ButtonRole.AcceptRole)
        cancel = dialog.addButton("Cancel", QMessageBox.ButtonRole.RejectRole)
        dialog.setDefaultButton(keep_running)
        dialog.exec()

        clicked = dialog.clickedButton()
        if clicked is keep_running:
            self.bridge.request_close_action("keep_running")
            event.ignore()
            self.showMinimized()
            return
        if clicked is pause_close:
            self._close_pending = True
            self.footer.setText("Pausing safely and saving the latest checkpoint before closing…")
            self._refresh_actions()
            self.bridge.request_close_action("pause_and_close")
            event.ignore()
            return
        if clicked is cancel:
            self.bridge.request_close_action("cancel")
            event.ignore()
            return
        event.ignore()

    @Slot()
    def _finish_safe_close(self) -> None:
        if not self._close_pending:
            return
        self._close_pending = False
        self._allow_close_once = True
        self.close()
