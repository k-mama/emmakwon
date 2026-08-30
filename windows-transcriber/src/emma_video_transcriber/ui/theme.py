from __future__ import annotations

from .models import STATUS_COMPLETED, STATUS_FAILED, STATUS_PAUSED, STATUS_QUEUED, STATUS_TRANSCRIBING

APP_QSS = """
QMainWindow, QWidget#Root {
    background: #F5F8FC;
    color: #3F4B59;
    font-family: "Segoe UI";
    font-size: 14px;
}
QFrame#Card, QFrame#PathCard {
    background: #FFFFFF;
    border: 1px solid #E2EAF3;
    border-radius: 18px;
}
QLabel#Title { color: #3F4B59; font-size: 26px; font-weight: 700; }
QLabel#Subtitle { color: #7C8997; font-size: 14px; }
QLabel#Muted, QLabel#QueueMeta, QLabel#Footer { color: #7C8997; }
QLabel#SectionTitle, QLabel#InputLabel { color: #3F4B59; font-size: 14px; font-weight: 650; }
QLabel#QueuePath { color: #3F4B59; font-size: 14px; font-weight: 600; }
QLabel#OutputName { color: #1688D4; font-weight: 650; }
QLabel#StatusText { font-weight: 600; }
QLabel#NumberBadge {
    color: #1688D4;
    background: #EAF5FF;
    border: 1px solid #D4EAFB;
    border-radius: 10px;
    font-weight: 700;
    padding: 4px 7px;
}
QLabel#WorkingPill {
    color: #0A84D8;
    background: #EAF5FF;
    border: 1px solid #D4EAFB;
    border-radius: 10px;
    padding: 4px 8px;
    font-weight: 650;
}
QLabel#SavedName { color: #3F4B59; font-size: 22px; font-weight: 700; }
QLabel#Percent { color: #0A84D8; font-size: 30px; font-weight: 700; }
QLabel#Value { color: #3F4B59; font-weight: 600; }
QLabel#FieldName { color: #9AA6B2; font-size: 12px; font-weight: 600; }
QLabel#PathMessage { color: #7C8997; min-height: 20px; }
QLabel#PathMessage[error="true"] { color: #B95056; }
QLabel#OutputHint { color: #7C8997; font-size: 13px; }
QLineEdit#PathInput {
    min-height: 48px;
    background: #FFFFFF;
    color: #3F4B59;
    border: 1px solid #E2EAF3;
    border-radius: 13px;
    padding: 0 14px;
    selection-background-color: #CFE8FC;
}
QLineEdit#PathInput:focus { border: 1px solid #1688D4; background: #FDFEFF; }
QPushButton {
    min-height: 44px;
    padding: 0 18px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 650;
}
QPushButton#AddPath {
    min-width: 50px;
    max-width: 50px;
    min-height: 50px;
    color: #FFFFFF;
    background: #1688D4;
    border: 1px solid #1688D4;
    font-size: 24px;
    font-weight: 500;
}
QPushButton#AddPath:hover { background: #0A84D8; border-color: #0A84D8; }
QPushButton#AddPath:pressed { background: #0877C2; }
QPushButton#AddPath:disabled { color: #FFFFFF; background: #C8D1DA; border-color: #C8D1DA; }
QPushButton#Primary {
    min-height: 50px;
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
    min-height: 8px;
    max-height: 8px;
    border: 0;
    border-radius: 4px;
    background: #EEF3F9;
}
QProgressBar::chunk { border-radius: 4px; background: #1688D4; }
QScrollArea { border: 0; background: transparent; }
QScrollArea > QWidget > QWidget { background: transparent; }
QFrame#QueueRow {
    background: #FFFFFF;
    border: 1px solid #E8EEF5;
    border-radius: 14px;
}
QFrame#QueueRow[active="true"] {
    background: #F2F9FF;
    border: 1px solid #BBDDFC;
}
QPushButton#RemoveRow {
    min-height: 26px;
    max-height: 26px;
    min-width: 26px;
    max-width: 26px;
    padding: 0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #9AA6B2;
    background: transparent;
    border: 1px solid transparent;
}
QPushButton#RemoveRow:hover { color: #B95056; background: #FBEEF0; border-color: #F0D9DC; }
QPushButton#RemoveRow:pressed { background: #F5DFE2; }
QPushButton#RemoveRow:disabled { color: #D7DEE5; background: transparent; border-color: transparent; }
QPushButton#ClearQueue {
    min-height: 30px;
    padding: 0 12px;
    border-radius: 10px;
    font-size: 12px;
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
