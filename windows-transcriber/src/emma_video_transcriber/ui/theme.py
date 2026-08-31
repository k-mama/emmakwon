from __future__ import annotations

from .models import STATUS_COMPLETED, STATUS_FAILED, STATUS_PAUSED, STATUS_QUEUED, STATUS_TRANSCRIBING

APP_QSS = """
QMainWindow, QWidget#Root {
    background: #F5F8FC;
    color: #3F4B59;
    font-family: "Segoe UI";
    font-size: 13px;
}
QFrame#Card, QFrame#PathCard {
    background: #FFFFFF;
    border: 1px solid #E2EAF3;
    border-radius: 18px;
}
QLabel#Title { color: #3F4B59; font-size: 24px; font-weight: 700; }
QLabel#Subtitle { color: #7C8997; font-size: 13px; }
QLabel#Muted, QLabel#Footer { color: #7C8997; }
QLabel#QueueMeta { color: #7C8997; font-size: 10px; }
QLabel#SectionTitle, QLabel#InputLabel { color: #3F4B59; font-size: 13px; font-weight: 650; }
QLabel#QueuePath { color: #3F4B59; font-size: 11px; font-weight: 600; }
QLabel#OutputName { color: #1688D4; font-size: 10px; font-weight: 650; }
QLabel#StatusText { font-size: 10px; font-weight: 600; }
QLabel#NumberBadge {
    color: #1688D4;
    background: #EAF5FF;
    border: 1px solid #D4EAFB;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 5px;
}
QLabel#WorkingPill {
    color: #0A84D8;
    background: #EAF5FF;
    border: 1px solid #D4EAFB;
    border-radius: 10px;
    padding: 3px 7px;
    font-size: 11px;
    font-weight: 650;
}
QLabel#SavedName { color: #3F4B59; font-size: 18px; font-weight: 700; }
QLabel#Percent { color: #0A84D8; font-size: 24px; font-weight: 700; }
QLabel#Value { color: #3F4B59; font-size: 11px; font-weight: 600; }
QLabel#FieldName { color: #9AA6B2; font-size: 10px; font-weight: 600; }
QLabel#PathMessage { color: #7C8997; min-height: 18px; font-size: 11px; }
QLabel#PathMessage[error="true"] { color: #B95056; }
QLabel#OutputHint { color: #7C8997; font-size: 11px; }
QLineEdit#PathInput {
    min-height: 42px;
    background: #FFFFFF;
    color: #3F4B59;
    border: 1px solid #E2EAF3;
    border-radius: 12px;
    padding: 0 12px;
    selection-background-color: #CFE8FC;
}
QLineEdit#PathInput:focus { border: 1px solid #1688D4; background: #FDFEFF; }
QPushButton {
    min-height: 40px;
    padding: 0 16px;
    border-radius: 11px;
    font-size: 12px;
    font-weight: 650;
}
QPushButton#Primary {
    min-height: 46px;
    color: #0A84D8;
    background: #EAF5FF;
    border: 1px solid #BBDDFC;
}
QPushButton#Primary:hover { background: #DDEFFF; border-color: #9FCFF5; }
QPushButton#Primary:pressed { background: #CFE8FC; }
QPushButton#Primary:disabled { color: #9AA6B2; background: #EEF3F9; border-color: #E2EAF3; }
QPushButton#Secondary {
    color: #3F4B59;
    background: #FFFFFF;
    border: 1px solid #E2EAF3;
}
QPushButton#Secondary:hover { background: #F2F9FF; border-color: #CFE4F5; }
QPushButton#Secondary:pressed { background: #EAF5FF; }
QPushButton#Secondary:disabled { color: #9AA6B2; background: #F5F8FC; border-color: #E2EAF3; }
QProgressBar {
    min-height: 7px;
    max-height: 7px;
    border: 0;
    border-radius: 3px;
    background: #EEF3F9;
}
QProgressBar#QueueProgress {
    min-height: 4px;
    max-height: 4px;
    border-radius: 2px;
}
QProgressBar::chunk { border-radius: 3px; background: #1688D4; }
QProgressBar#QueueProgress::chunk { border-radius: 2px; background: #1688D4; }
QScrollArea { border: 0; background: transparent; }
QScrollArea > QWidget > QWidget { background: transparent; }
QFrame#QueueRow {
    background: #FFFFFF;
    border: 1px solid #E8EEF5;
    border-radius: 12px;
}
QFrame#QueueRow[active="true"] {
    background: #F2F9FF;
    border: 1px solid #BBDDFC;
}
QPushButton#RemoveRow {
    min-height: 22px;
    max-height: 22px;
    min-width: 22px;
    max-width: 22px;
    padding: 0;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 600;
    color: #9AA6B2;
    background: transparent;
    border: 1px solid transparent;
}
QPushButton#RemoveRow:hover { color: #B95056; background: #FBEEF0; border-color: #F0D9DC; }
QPushButton#RemoveRow:pressed { background: #F5DFE2; }
QPushButton#RemoveRow:disabled { color: #D7DEE5; background: transparent; border-color: transparent; }
QPushButton#ClearQueue {
    min-height: 28px;
    padding: 0 10px;
    border-radius: 9px;
    font-size: 10px;
    font-weight: 650;
    color: #7C8997;
    background: transparent;
    border: 1px solid #E2EAF3;
}
QPushButton#ClearQueue:hover { background: #F2F9FF; border-color: #CFE4F5; color: #3F4B59; }
QPushButton#ClearQueue:pressed { background: #EAF5FF; }
QPushButton#ClearQueue:disabled { color: #C8D1DA; background: transparent; border-color: #EEF3F9; }
"""

STATUS_VISUALS = {
    STATUS_QUEUED: ("Waiting", "#7C8997"),
    STATUS_TRANSCRIBING: ("Transcribing", "#1688D4"),
    STATUS_COMPLETED: ("Completed", "#398262"),
    STATUS_FAILED: ("Failed", "#B95056"),
    STATUS_PAUSED: ("Paused", "#8E7447"),
}
