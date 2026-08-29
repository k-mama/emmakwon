from __future__ import annotations

from PySide6.QtCore import Qt, Slot
from PySide6.QtGui import QFontMetrics
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QProgressBar, QVBoxLayout, QWidget

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
    def __init__(self, job: UiJob, position: int, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("QueueRow")
        self.setProperty("active", job.status == STATUS_TRANSCRIBING)
        self.setMinimumHeight(96)

        root = QHBoxLayout(self)
        root.setContentsMargins(15, 12, 15, 12)
        root.setSpacing(12)

        icon_text, icon_color = STATUS_VISUALS[job.status]
        icon = QLabel(icon_text)
        icon.setObjectName("StatusDot")
        icon.setStyleSheet(f"color: {icon_color};")
        icon.setFixedWidth(22)
        icon.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignHCenter)
        root.addWidget(icon)

        body = QVBoxLayout()
        body.setSpacing(4)

        title = ElidedLabel(f"{position}. {job.source_name}")
        title.setObjectName("QueueTitle")
        title.setToolTip(str(job.source_path))
        body.addWidget(title)

        meta = QHBoxLayout()
        meta.setSpacing(16)
        duration = QLabel(format_duration_ms(job.duration_ms))
        duration.setObjectName("QueueMeta")
        output = QLabel(f"→ {job.output_path.name}")
        output.setObjectName("OutputName")
        meta.addWidget(duration)
        meta.addWidget(output)
        meta.addStretch(1)
        body.addLayout(meta)

        status = QLabel(job.status_text)
        status.setObjectName("StatusText")
        status.setStyleSheet(f"color: {icon_color};")
        status.setToolTip(job.error or "")
        body.addWidget(status)

        if job.status in {STATUS_TRANSCRIBING, STATUS_COMPLETED, STATUS_PAUSED}:
            progress = QProgressBar()
            progress.setRange(0, 100)
            progress.setValue(100 if job.status == STATUS_COMPLETED else job.percent)
            progress.setTextVisible(False)
            body.addWidget(progress)

        root.addLayout(body, 1)


class ActiveJobPanel(QFrame):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("Card")
        self.setMinimumWidth(330)

        root = QVBoxLayout(self)
        root.setContentsMargins(22, 22, 22, 22)
        root.setSpacing(12)

        heading = QLabel("CURRENT JOB")
        heading.setObjectName("SectionTitle")
        root.addWidget(heading)

        self.source = QLabel()
        self.source.setObjectName("ActiveFile")
        self.source.setWordWrap(True)
        root.addWidget(self.source)

        self.output = QLabel()
        self.output.setObjectName("Muted")
        self.output.setWordWrap(True)
        root.addWidget(self.output)

        percent_line = QHBoxLayout()
        self.percent = QLabel("0%")
        self.percent.setObjectName("Percent")
        percent_line.addWidget(self.percent)
        percent_line.addStretch(1)
        root.addLayout(percent_line)

        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.progress.setTextVisible(False)
        root.addWidget(self.progress)

        self.time_value = self._add_field(root, "VIDEO TIME")
        self.speed_value = self._add_field(root, "PROCESSING SPEED")
        self.eta_value = self._add_field(root, "ESTIMATED REMAINING")
        self.checkpoint_value = self._add_field(root, "LAST SAFE SAVE")

        root.addStretch(1)
        assurance = QLabel("You can minimize this app and keep using your PC.")
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
            self.source.setText("Ready when you are.")
            self.output.setText("Add videos, then start transcription.")
            self.percent.setText("0%")
            self.progress.setValue(0)
            self.time_value.setText("—")
            self.speed_value.setText("—")
            self.eta_value.setText("—")
            self.checkpoint_value.setText("—")
            return

        percent = snapshot.resolved_percent
        self.source.setText(snapshot.source_name)
        self.output.setText(f"Saving to {snapshot.output_name}")
        self.percent.setText(f"{percent}%")
        self.progress.setValue(percent)
        self.time_value.setText(format_progress_time(snapshot.current_ms, snapshot.duration_ms))
        self.speed_value.setText(snapshot.speed_text or "—")
        self.eta_value.setText(snapshot.eta_text or "—")
        self.checkpoint_value.setText(snapshot.checkpoint_text or "—")
