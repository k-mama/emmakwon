from __future__ import annotations

from .models import STATUS_COMPLETED, STATUS_FAILED, STATUS_PAUSED, STATUS_QUEUED, STATUS_TRANSCRIBING

APP_QSS = """
QMainWindow, QWidget#Root {
    background: #F4F6FA;
    color: #172033;
    font-family: "Segoe UI";
    font-size: 14px;
}
QFrame#Card {
    background: #FFFFFF;
    border: 1px solid #E4E8EF;
    border-radius: 14px;
}
QLabel#Title { color: #121A2A; font-size: 25px; font-weight: 700; }
QLabel#Subtitle, QLabel#Muted, QLabel#QueueMeta, QLabel#Footer { color: #70798A; }
QLabel#SectionTitle { color: #20293A; font-size: 15px; font-weight: 650; }
QLabel#ActiveFile { color: #172033; font-size: 17px; font-weight: 650; }
QLabel#Percent { color: #172033; font-size: 28px; font-weight: 700; }
QPushButton {
    min-height: 46px;
    padding: 0 22px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 650;
}
QPushButton#Primary { color: white; background: #235CE8; border: 1px solid #235CE8; }
QPushButton#Primary:hover { background: #1E52D1; }
QPushButton#Primary:pressed { background: #1948BA; }
QPushButton#Primary:disabled { color: #A8B3C7; background: #E8ECF4; border-color: #E8ECF4; }
QPushButton#Secondary { color: #26334A; background: #FFFFFF; border: 1px solid #D9DEE8; }
QPushButton#Secondary:hover { background: #F8FAFD; }
QPushButton#Secondary:disabled { color: #A0A8B7; background: #F6F7F9; }
QProgressBar {
    min-height: 8px;
    max-height: 8px;
    border: 0;
    border-radius: 4px;
    background: #E9EDF4;
    text-align: center;
}
QProgressBar::chunk { border-radius: 4px; background: #235CE8; }
QScrollArea { border: 0; background: transparent; }
QScrollArea > QWidget > QWidget { background: transparent; }
QFrame#QueueRow { background: #FFFFFF; border: 0; border-bottom: 1px solid #EDF0F5; }
QFrame#QueueRow[active="true"] { background: #F8FAFF; }
QLabel#StatusDot { font-size: 16px; font-weight: 700; }
QLabel#QueueTitle { color: #1B2434; font-size: 14px; font-weight: 650; }
QLabel#OutputName { color: #44516A; font-weight: 600; }
QLabel#StatusText { font-weight: 600; }
QLabel#Value { color: #26334A; font-weight: 600; }
QLabel#FieldName { color: #7A8495; }
"""

STATUS_VISUALS = {
    STATUS_QUEUED: ("○", "#8993A4"),
    STATUS_TRANSCRIBING: ("●", "#235CE8"),
    STATUS_COMPLETED: ("✓", "#25845C"),
    STATUS_FAILED: ("!", "#C2414A"),
    STATUS_PAUSED: ("Ⅱ", "#A46A13"),
}
