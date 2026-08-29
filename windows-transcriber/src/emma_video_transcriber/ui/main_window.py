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
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from .bridge import UiEventBridge
from .models import ActiveJobSnapshot, STATUS_FAILED, STATUS_PAUSED, STATUS_QUEUED, STATUS_TRANSCRIBING, UiJob
from .path_entry import validate_path_entry
from .theme import APP_QSS
from .widgets import ActiveJobPanel, QueueRow


OUTPUT_FOLDER_DISPLAY = r"Downloads\EmmaVideoTranscriber"


class MainWindow(QMainWindow):
    """Single-purpose path-to-transcript UI; all long work stays off the Qt UI thread."""

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
        self.setMinimumSize(QSize(980, 700))
        self.resize(1180, 800)
        self.setStyleSheet(APP_QSS)

        self._build_ui()
        self._connect_bridge()
        self._connect_shortcuts()
        self._refresh_actions()
        self.path_input.setFocus()

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
        subtitle = QLabel("Long videos → clean TXT, processed locally")
        subtitle.setObjectName("Subtitle")
        header.addWidget(title)
        header.addWidget(subtitle)
        page.addLayout(header)

        path_card = QFrame()
        path_card.setObjectName("PathCard")
        path_layout = QVBoxLayout(path_card)
        path_layout.setContentsMargins(20, 18, 20, 16)
        path_layout.setSpacing(8)

        input_label = QLabel("VIDEO FILE PATH")
        input_label.setObjectName("InputLabel")
        path_layout.addWidget(input_label)

        input_row = QHBoxLayout()
        input_row.setSpacing(8)
        self.path_input = QLineEdit()
        self.path_input.setObjectName("PathInput")
        self.path_input.setPlaceholderText("Paste the full video file path here")
        self.path_input.setClearButtonEnabled(True)
        self.path_input.returnPressed.connect(self._submit_path)
        self.path_input.textChanged.connect(self._clear_path_message)
        input_row.addWidget(self.path_input, 1)

        self.add_path_button = QPushButton("+")
        self.add_path_button.setObjectName("AddPath")
        self.add_path_button.setToolTip("Add this path to the queue")
        self.add_path_button.clicked.connect(self._submit_path)
        input_row.addWidget(self.add_path_button)

        self.browse_button = QPushButton("Browse")
        self.browse_button.setObjectName("Secondary")
        self.browse_button.setToolTip("Choose one video and place its path in the field")
        self.browse_button.clicked.connect(self._browse_one_video)
        input_row.addWidget(self.browse_button)
        path_layout.addLayout(input_row)

        self.path_message = QLabel("")
        self.path_message.setObjectName("PathMessage")
        self.path_message.setProperty("error", False)
        path_layout.addWidget(self.path_message)

        output_hint = QLabel(f"Output: {OUTPUT_FOLDER_DISPLAY}")
        output_hint.setObjectName("OutputHint")
        path_layout.addWidget(output_hint)
        page.addWidget(path_card)

        content = QHBoxLayout()
        content.setSpacing(18)

        queue_card = QFrame()
        queue_card.setObjectName("Card")
        queue_layout = QVBoxLayout(queue_card)
        queue_layout.setContentsMargins(20, 18, 20, 18)
        queue_layout.setSpacing(10)

        queue_header = QHBoxLayout()
        queue_title = QLabel("QUEUE")
        queue_title.setObjectName("SectionTitle")
        self.queue_count = QLabel("0 videos")
        self.queue_count.setObjectName("Muted")
        queue_header.addWidget(queue_title)
        queue_header.addStretch(1)
        queue_header.addWidget(self.queue_count)
        queue_layout.addLayout(queue_header)

        self.empty_queue = QLabel("Paste a complete video path above, then press +.")
        self.empty_queue.setObjectName("Muted")
        self.empty_queue.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_queue.setWordWrap(True)
        self.empty_queue.setMinimumHeight(170)
        queue_layout.addWidget(self.empty_queue)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.scroll_content = QWidget()
        self.scroll_layout = QVBoxLayout(self.scroll_content)
        self.scroll_layout.setContentsMargins(0, 0, 0, 0)
        self.scroll_layout.setSpacing(9)
        self.scroll_layout.addStretch(1)
        self.scroll.setWidget(self.scroll_content)
        self.scroll.hide()
        queue_layout.addWidget(self.scroll, 1)

        self.active_panel = ActiveJobPanel()
        content.addWidget(queue_card, 64)
        content.addWidget(self.active_panel, 36)
        page.addLayout(content, 1)

        actions = QHBoxLayout()
        actions.setSpacing(10)
        self.start_button = QPushButton("START TRANSCRIPTION")
        self.start_button.setObjectName("Primary")
        self.start_button.setToolTip("Start or resume the queue (Ctrl+Enter)")
        self.start_button.clicked.connect(self.bridge.request_start)
        actions.addWidget(self.start_button, 1)

        self.open_output_button = QPushButton("OPEN OUTPUT FOLDER")
        self.open_output_button.setObjectName("Secondary")
        self.open_output_button.setToolTip("Open Downloads\\EmmaVideoTranscriber (Ctrl+Shift+O)")
        self.open_output_button.clicked.connect(self.bridge.request_open_output_folder)
        actions.addWidget(self.open_output_button)
        page.addLayout(actions)

        self.footer = QLabel("Ready. Your original videos are never copied or modified.")
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
        QShortcut(QKeySequence("Ctrl+O"), self, activated=self._browse_one_video)
        QShortcut(QKeySequence("Ctrl+Return"), self, activated=self._start_from_shortcut)
        QShortcut(QKeySequence("Ctrl+Enter"), self, activated=self._start_from_shortcut)
        QShortcut(QKeySequence("Ctrl+Shift+O"), self, activated=self.bridge.request_open_output_folder)

    @Slot()
    def _submit_path(self) -> None:
        result = validate_path_entry(self.path_input.text(), (job.source_path for job in self._jobs))
        if not result.accepted or result.path is None:
            self._set_path_message(result.message, error=True)
            self.path_input.setFocus()
            return

        if not self.bridge.request_add_path(result.path):
            self._set_path_message("Could not add this path. Try again.", error=True)
            self.path_input.setFocus()
            return

        self.path_input.clear()
        self._set_path_message("Path accepted. Waiting for the queue to update.", error=False)
        self.path_input.setFocus()

    @Slot()
    def _browse_one_video(self) -> None:
        selected, _ = QFileDialog.getOpenFileName(
            self,
            "Choose a video",
            "",
            "Videos (*.mp4 *.mkv *.mov *.avi *.m4v *.webm *.ts *.mts *.m2ts);;All files (*.*)",
        )
        if not selected:
            self.path_input.setFocus()
            return
        self.path_input.setText(selected)
        self.path_input.setFocus()
        self.path_input.selectAll()

    @Slot(str)
    def _clear_path_message(self, _text: str) -> None:
        if self.path_message.text():
            self._set_path_message("", error=False)

    def _set_path_message(self, message: str, *, error: bool) -> None:
        self.path_message.setText(message)
        self.path_message.setProperty("error", error)
        self.path_message.style().unpolish(self.path_message)
        self.path_message.style().polish(self.path_message)

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
            self.footer.setText("Ready. Your original videos are never copied or modified.")

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
        can_interact = not self._close_pending
        self.start_button.setEnabled(bool(self._jobs) and actionable and not self._is_running and can_interact)
        self.start_button.setText("TRANSCRIBING…" if self._is_running else "START TRANSCRIPTION")
        self.path_input.setEnabled(can_interact)
        self.add_path_button.setEnabled(can_interact)
        self.browse_button.setEnabled(can_interact)
        self.open_output_button.setEnabled(can_interact)

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
            self.footer.setText("Finishing the current safe segment…")
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
