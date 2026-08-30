from __future__ import annotations

from PySide6.QtCore import Qt, Signal, Slot
from PySide6.QtGui import QFontMetrics
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from .models import (
    ActiveJobSnapshot,
    STATUS_COMPLETED,
    STATUS_PAUSED,
    STATUS_TRANSCRIBING,
    UiJob,
    format_duration_ms,
    format_progress_time,
)
from .theme import STATUS_VISUALS


class ElidedLabel(QLabel):
    def __init__(self, text: str = "", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._full_text = text
        self.setToolTip(text)
        self._apply_elision()

    def set_full_text(self, text: str) -> None:
        self._full_text = text
        self.setToolTip(text)
        self._apply_elision()

    def resizeEvent(self, event) -> None:  # type: ignore[no-untyped-def]
        super().resizeEvent(event)
        self._apply_elision()

    def _apply_elision(self) -> None:
        width = max(40, self.contentsRect().width())
        metrics = QFontMetrics(self.font())
        QLabel.setText(self, metrics.elidedText(self._full_text, Qt.TextElideMode.ElideMiddle, width))


class QueueRow(QFrame):
    remove_requested = Signal(str)

    def __init__(self, job: UiJob, position: int, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.job_id = job.job_id
        self.setObjectName("QueueRow")
        self.setProperty("active", job.status == STATUS_TRANSCRIBING)
        self.setMinimumHeight(112)

        root = QHBoxLayout(self)
        root.setContentsMargins(14, 13, 14, 13)
        root.setSpacing(13)

        number = QLabel(f"{position:02d}")
        number.setObjectName("NumberBadge")
        number.setAlignment(Qt.AlignmentFlag.AlignCenter)
        number.setFixedWidth(42)
        root.addWidget(number, 0, Qt.AlignmentFlag.AlignTop)

        body = QVBoxLayout()
        body.setSpacing(5)

        path_text = str(job.source_path)
        path_label = ElidedLabel(path_text)
        path_label.setObjectName("QueuePath")
        path_label.setToolTip(path_text)
        body.addWidget(path_label)

        output = QLabel(f"→ {job.output_path.name}")
        output.setObjectName("OutputName")
        body.addWidget(output)

        bottom = QHBoxLayout()
        bottom.setSpacing(12)
        _, status_color = STATUS_VISUALS[job.status]
        status = QLabel(job.status_text)
        status.setObjectName("StatusText")
        status.setStyleSheet(f"color: {status_color};")
        status.setToolTip(job.error or "")
        bottom.addWidget(status)

        if job.duration_ms >= 0:
            time_text = (
                format_progress_time(job.current_ms, job.duration_ms)
                if job.status in {STATUS_TRANSCRIBING, STATUS_PAUSED}
                else format_duration_ms(job.duration_ms)
            )
            duration = QLabel(time_text)
            duration.setObjectName("QueueMeta")
            bottom.addWidget(duration)
        bottom.addStretch(1)
        body.addLayout(bottom)

        if job.status in {STATUS_TRANSCRIBING, STATUS_COMPLETED, STATUS_PAUSED}:
            progress = QProgressBar()
            progress.setRange(0, 100)
            progress.setValue(100 if job.status == STATUS_COMPLETED else job.percent)
            progress.setTextVisible(False)
            body.addWidget(progress)

        root.addLayout(body, 1)

        self.remove_button = QPushButton("✕")
        self.remove_button.setObjectName("RemoveRow")
        is_active = job.status == STATUS_TRANSCRIBING
        self.remove_button.setEnabled(not is_active)
        self.remove_button.setToolTip(
            "Pause the queue first to remove the job being transcribed"
            if is_active
            else "Remove from the queue (does not delete the video or any saved transcript)"
        )
        self.remove_button.clicked.connect(lambda: self.remove_requested.emit(self.job_id))
        root.addWidget(self.remove_button, 0, Qt.AlignmentFlag.AlignTop)


class ActiveJobPanel(QFrame):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("Card")
        self.setMinimumWidth(330)

        root = QVBoxLayout(self)
        root.setContentsMargins(22, 21, 22, 21)
        root.setSpacing(10)

        top = QHBoxLayout()
        heading = QLabel("CURRENT JOB")
        heading.setObjectName("SectionTitle")
        self.working = QLabel("● Working")
        self.working.setObjectName("WorkingPill")
        top.addWidget(heading)
        top.addStretch(1)
        top.addWidget(self.working)
        root.addLayout(top)

        saved_label = QLabel("Saved as")
        saved_label.setObjectName("FieldName")
        root.addWidget(saved_label)

        self.output = QLabel("—")
        self.output.setObjectName("SavedName")
        root.addWidget(self.output)

        self.source = ElidedLabel("")
        self.source.setObjectName("Muted")
        root.addWidget(self.source)

        percent_line = QHBoxLayout()
        progress_label = QLabel("Progress")
        progress_label.setObjectName("FieldName")
        self.percent = QLabel("0%")
        self.percent.setObjectName("Percent")
        percent_line.addWidget(progress_label)
        percent_line.addStretch(1)
        percent_line.addWidget(self.percent)
        root.addLayout(percent_line)

        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.progress.setTextVisible(False)
        root.addWidget(self.progress)

        self.time_value = self._add_field(root, "PROCESSED")
        self.speed_value = self._add_field(root, "SPEED")
        self.eta_value = self._add_field(root, "ESTIMATED REMAINING")
        self.checkpoint_value = self._add_field(root, "LAST SAFE SAVE")

        root.addStretch(1)
        assurance = QLabel("You can minimize this window and keep using your PC.")
        assurance.setObjectName("Muted")
        assurance.setWordWrap(True)
        root.addWidget(assurance)
        self.set_snapshot(None)

    @staticmethod
    def _add_field(layout: QVBoxLayout, label_text: str) -> QLabel:
        label = QLabel(label_text)
        label.setObjectName("FieldName")
        layout.addWidget(label)
        value = QLabel("—")
        value.setObjectName("Value")
        value.setWordWrap(True)
        layout.addWidget(value)
        return value

    @Slot(object)
    def set_snapshot(self, snapshot: ActiveJobSnapshot | None) -> None:
        if snapshot is None:
            self.working.hide()
            self.output.setText("No active job")
            self.source.set_full_text("When transcription starts, progress will appear here.")
            self.percent.setText("0%")
            self.progress.setValue(0)
            self.time_value.setText("—")
            self.speed_value.setText("—")
            self.eta_value.setText("—")
            self.checkpoint_value.setText("—")
            return

        self.working.show()
        percent = snapshot.resolved_percent
        self.output.setText(snapshot.output_name or "—")
        self.source.set_full_text(snapshot.source_name)
        self.percent.setText(f"{percent}%")
        self.progress.setValue(percent)
        self.time_value.setText(format_progress_time(snapshot.current_ms, snapshot.duration_ms))
        self.speed_value.setText(snapshot.speed_text or "—")
        self.eta_value.setText(snapshot.eta_text or "—")
        self.checkpoint_value.setText(snapshot.checkpoint_text or "—")
