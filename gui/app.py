"""
BEMS PyQt5 Desktop Monitor Application — Apex Corporate Tower
Modern, colorful, high-performance energy management desktop dashboard.
Credentials loaded from .env via gui/credentials.py (separated from GUI logic).
"""
import sys
import os
import json
import threading
import time
import urllib.request
import urllib.error

# Ensure project root is on sys.path so imports work whether this script
# is launched as `python gui/app.py` OR `python -m gui.app`
_GUI_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.dirname(_GUI_DIR)
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

# Load credentials first (before GUI imports)
from gui.credentials import Credentials

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QTabWidget, QTableWidget, QTableWidgetItem,
    QHeaderView, QFrame, QScrollArea, QGridLayout, QGroupBox,
    QSizePolicy, QSplitter, QComboBox, QLineEdit, QFormLayout,
    QStatusBar, QProgressBar
)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal, QObject, QSize
from PyQt5.QtGui import (
    QFont, QPalette, QColor, QLinearGradient, QBrush, QPainter,
    QIcon, QPen, QPixmap
)

# ─────────────────────────────────────────────────────────────────────────────
# THEME CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

PALETTE = {
    "bg_dark":       "#0f172a",
    "bg_card":       "#1e293b",
    "bg_card_hover": "#263248",
    "border":        "#334155",
    "text_primary":  "#f8fafc",
    "text_muted":    "#94a3b8",
    "text_dimmed":   "#64748b",
    "blue":          "#3b82f6",
    "blue_dark":     "#1d4ed8",
    "indigo":        "#6366f1",
    "emerald":       "#10b981",
    "emerald_dark":  "#059669",
    "amber":         "#f59e0b",
    "amber_dark":    "#d97706",
    "rose":          "#f43f5e",
    "rose_dark":     "#e11d48",
    "slate":         "#475569",
    "purple":        "#a855f7",
    "teal":          "#14b8a6",
    "cyan":          "#06b6d4",
}

BASE_STYLESHEET = f"""
QMainWindow, QWidget {{
    background-color: {PALETTE['bg_dark']};
    color: {PALETTE['text_primary']};
    font-family: "Segoe UI", "Inter", sans-serif;
}}

/* ── Tabs ── */
QTabWidget::pane {{
    border: 1px solid {PALETTE['border']};
    background-color: {PALETTE['bg_dark']};
    border-radius: 6px;
}}
QTabBar::tab {{
    background: {PALETTE['bg_card']};
    color: {PALETTE['text_muted']};
    padding: 9px 18px;
    font-weight: 600;
    font-size: 11px;
    border: none;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    margin-right: 2px;
}}
QTabBar::tab:selected {{
    background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 {PALETTE['blue']},stop:1 {PALETTE['indigo']});
    color: white;
}}
QTabBar::tab:hover:!selected {{
    background: {PALETTE['border']};
    color: {PALETTE['text_primary']};
}}

/* ── Buttons ── */
QPushButton {{
    border-radius: 6px;
    padding: 6px 14px;
    font-weight: 600;
    font-size: 11px;
    border: none;
    cursor: pointer;
}}
QPushButton#btnPrimary {{
    background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 {PALETTE['blue']},stop:1 {PALETTE['indigo']});
    color: white;
}}
QPushButton#btnPrimary:hover {{
    background: {PALETTE['blue_dark']};
}}
QPushButton#btnEmerald {{
    background: {PALETTE['emerald']};
    color: white;
}}
QPushButton#btnEmerald:hover {{
    background: {PALETTE['emerald_dark']};
}}
QPushButton#btnAmber {{
    background: {PALETTE['amber']};
    color: white;
}}
QPushButton#btnAmber:hover {{
    background: {PALETTE['amber_dark']};
}}
QPushButton#btnRose {{
    background: {PALETTE['rose']};
    color: white;
}}
QPushButton#btnRose:hover {{
    background: {PALETTE['rose_dark']};
}}
QPushButton#btnSlate {{
    background: {PALETTE['slate']};
    color: white;
}}
QPushButton#btnSlate:hover {{
    background: #64748b;
}}

/* ── Table ── */
QTableWidget {{
    background-color: {PALETTE['bg_card']};
    color: {PALETTE['text_primary']};
    border: 1px solid {PALETTE['border']};
    border-radius: 6px;
    gridline-color: {PALETTE['border']};
    font-size: 11px;
    outline: 0;
}}
QTableWidget::item {{
    padding: 6px 8px;
    border-bottom: 1px solid {PALETTE['border']};
}}
QTableWidget::item:selected {{
    background-color: #1e3a8a;
    color: white;
}}
QHeaderView::section {{
    background-color: #0f172a;
    color: {PALETTE['text_muted']};
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
    padding: 8px;
    border: none;
    border-bottom: 2px solid {PALETTE['blue']};
}}

/* ── Scrollbar ── */
QScrollBar:vertical {{
    background: {PALETTE['bg_card']};
    width: 6px;
    border-radius: 3px;
}}
QScrollBar::handle:vertical {{
    background: {PALETTE['border']};
    border-radius: 3px;
    min-height: 20px;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
    height: 0px;
}}

/* ── Inputs ── */
QLineEdit, QComboBox {{
    background: {PALETTE['bg_card']};
    color: {PALETTE['text_primary']};
    border: 1px solid {PALETTE['border']};
    border-radius: 5px;
    padding: 5px 8px;
    font-size: 11px;
}}
QLineEdit:focus, QComboBox:focus {{
    border: 1px solid {PALETTE['blue']};
}}
QComboBox::drop-down {{
    border: none;
    background: {PALETTE['border']};
    border-radius: 0 5px 5px 0;
}}
QGroupBox {{
    border: 1px solid {PALETTE['border']};
    border-radius: 8px;
    margin-top: 10px;
    font-weight: 700;
    font-size: 11px;
    color: {PALETTE['text_muted']};
    padding: 10px;
}}
QGroupBox::title {{
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 6px;
    background: {PALETTE['bg_dark']};
    border-radius: 4px;
    color: {PALETTE['cyan']};
}}
QStatusBar {{
    background: {PALETTE['bg_card']};
    color: {PALETTE['text_muted']};
    font-size: 10px;
    border-top: 1px solid {PALETTE['border']};
}}
"""

# ─────────────────────────────────────────────────────────────────────────────
# DATA WORKER (background polling thread)
# ─────────────────────────────────────────────────────────────────────────────

class DataWorker(QObject):
    data_received = pyqtSignal(dict)
    error_received = pyqtSignal(str)

    def __init__(self, api_url):
        super().__init__()
        self._api_url = api_url
        self._running = False

    def set_api_url(self, url):
        self._api_url = url

    def stop(self):
        self._running = False

    def fetch_once(self):
        try:
            url = f"{self._api_url}/api/gui/summary"
            req = urllib.request.Request(url, headers={"User-Agent": "BEMS-PyQt5-GUI/1.0"})
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.data_received.emit(data)
        except Exception as e:
            self.error_received.emit(str(e))


class PollingThread(QThread):
    data_received = pyqtSignal(dict)
    error_received = pyqtSignal(str)

    def __init__(self, api_url, interval=1.0):
        super().__init__()
        self._api_url = api_url
        self._interval = interval
        self._running = True

    def set_api_url(self, url):
        self._api_url = url

    def stop(self):
        self._running = False

    def run(self):
        while self._running:
            try:
                url = f"{self._api_url}/api/gui/summary"
                req = urllib.request.Request(url, headers={"User-Agent": "BEMS-PyQt5-GUI/1.0"})
                with urllib.request.urlopen(req, timeout=2.5) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    self.data_received.emit(data)
            except Exception as e:
                self.error_received.emit(str(e))
            time.sleep(self._interval)


# ─────────────────────────────────────────────────────────────────────────────
# REUSABLE CARD WIDGET
# ─────────────────────────────────────────────────────────────────────────────

def styled_card(accent_hex="#3b82f6", radius=10, padding=12):
    """Returns a stylesheet string for a metric card."""
    return f"""
    QFrame#metricCard {{
        background-color: #1e293b;
        border: 1px solid {accent_hex}60;
        border-left: 3px solid {accent_hex};
        border-radius: {radius}px;
        padding: {padding}px;
    }}
    """

class MetricCard(QFrame):
    def __init__(self, title, accent="#3b82f6", parent=None):
        super().__init__(parent)
        self.setObjectName("metricCard")
        self.accent = accent
        self.setStyleSheet(f"""
            QFrame#metricCard {{
                background-color: #1e293b;
                border: 1px solid {accent}55;
                border-left: 4px solid {accent};
                border-radius: 10px;
            }}
        """)
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
        self.setMinimumHeight(100)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 10, 14, 10)
        layout.setSpacing(3)

        self.lbl_title = QLabel(title.upper())
        self.lbl_title.setFont(QFont("Segoe UI", 8, QFont.Bold))
        self.lbl_title.setStyleSheet(f"color: {PALETTE['text_muted']};")

        self.lbl_value = QLabel("—")
        self.lbl_value.setFont(QFont("Segoe UI", 20, QFont.Bold))
        self.lbl_value.setStyleSheet(f"color: {accent};")

        self.lbl_sub = QLabel("")
        self.lbl_sub.setFont(QFont("Segoe UI", 8))
        self.lbl_sub.setStyleSheet(f"color: {PALETTE['text_dimmed']};")

        layout.addWidget(self.lbl_title)
        layout.addWidget(self.lbl_value)
        layout.addWidget(self.lbl_sub)

    def set_value(self, val, color=None):
        self.lbl_value.setText(str(val))
        if color:
            self.lbl_value.setStyleSheet(f"color: {color};")

    def set_sub(self, txt, color=None):
        self.lbl_sub.setText(txt)
        if color:
            self.lbl_sub.setStyleSheet(f"color: {color};")


class FloorCard(QFrame):
    inspect_signal = pyqtSignal(str)

    def __init__(self, floor_num, accent="#3b82f6", parent=None):
        super().__init__(parent)
        self.floor_num = floor_num
        self.setObjectName(f"floorCard{floor_num}")
        self.setStyleSheet(f"""
            QFrame#floorCard{floor_num} {{
                background-color: #1e293b;
                border: 1px solid {PALETTE['border']};
                border-top: 3px solid {accent};
                border-radius: 10px;
            }}
            QFrame#floorCard{floor_num}:hover {{
                border: 1px solid {accent};
                border-top: 3px solid {accent};
            }}
        """)
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(4)

        # Header row
        hdr = QHBoxLayout()
        self.lbl_num = QLabel(f"FLOOR {floor_num}")
        self.lbl_num.setFont(QFont("Segoe UI", 11, QFont.Bold))
        self.lbl_num.setStyleSheet("color: #f8fafc;")

        self.lbl_badge = QLabel("✓ Normal")
        self.lbl_badge.setFont(QFont("Segoe UI", 8, QFont.Bold))
        self.lbl_badge.setStyleSheet("color: #10b981; background: #064e3b; border-radius: 4px; padding: 2px 6px;")

        hdr.addWidget(self.lbl_num)
        hdr.addStretch()
        hdr.addWidget(self.lbl_badge)
        layout.addLayout(hdr)

        # Subtitle
        self.lbl_sub = QLabel("Loading...")
        self.lbl_sub.setFont(QFont("Segoe UI", 8))
        self.lbl_sub.setStyleSheet(f"color: {PALETTE['text_muted']};")
        layout.addWidget(self.lbl_sub)

        # Separator line
        sep = QFrame()
        sep.setFrameShape(QFrame.HLine)
        sep.setStyleSheet(f"color: {PALETTE['border']};")
        layout.addWidget(sep)

        # Metrics grid
        mg = QGridLayout()
        mg.setSpacing(2)

        self._add_metric(mg, "PREDICTED", 0)
        self._add_metric(mg, "ACTUAL", 1)
        self._add_metric(mg, "DIFFERENCE", 2)

        self.lbl_pred = QLabel("— kWh")
        self.lbl_act = QLabel("— kWh")
        self.lbl_diff = QLabel("—")
        for lbl, col in [(self.lbl_pred, 0), (self.lbl_act, 1), (self.lbl_diff, 2)]:
            lbl.setFont(QFont("Segoe UI", 10, QFont.Bold))
            lbl.setStyleSheet("color: #f8fafc;")
            lbl.setAlignment(Qt.AlignCenter)
            mg.addWidget(lbl, 1, col)

        layout.addLayout(mg)

        # Bottom row (driver + inspect button)
        btm = QHBoxLayout()
        self.lbl_driver = QLabel("Driver: —")
        self.lbl_driver.setFont(QFont("Segoe UI", 8))
        self.lbl_driver.setStyleSheet(f"color: {PALETTE['purple']};")
        btm.addWidget(self.lbl_driver)
        btm.addStretch()

        btn = QPushButton(f"Inspect →")
        btn.setObjectName("btnSlate")
        btn.setFixedWidth(76)
        btn.setCursor(Qt.PointingHandCursor)
        btn.clicked.connect(lambda: self.inspect_signal.emit(f"floor-{floor_num}"))
        btm.addWidget(btn)
        layout.addLayout(btm)

    def _add_metric(self, grid, text, col):
        lbl = QLabel(text)
        lbl.setFont(QFont("Segoe UI", 7, QFont.Bold))
        lbl.setStyleSheet(f"color: {PALETTE['text_dimmed']};")
        lbl.setAlignment(Qt.AlignCenter)
        grid.addWidget(lbl, 0, col)

    def update_floor(self, data: dict):
        name = data.get("name", f"Floor {self.floor_num}")
        short = name.replace(f"Floor {self.floor_num} - ", "")
        self.lbl_sub.setText(short[:40])

        status = data.get("status", "Normal")
        diff = data.get("difference_kw", 0)
        pred = data.get("predicted_kw", 0)
        act = data.get("actual_kw", 0)
        driver = data.get("top_driver", "HVAC Status")

        increasing = "Increasing" in status or diff > 3.5
        if increasing:
            self.lbl_badge.setText("⚠ INCREASING")
            self.lbl_badge.setStyleSheet("color: #f43f5e; background: #4c0519; border-radius: 4px; padding: 2px 6px;")
            self.lbl_diff.setStyleSheet("color: #f43f5e; font-weight: bold;")
        else:
            self.lbl_badge.setText("✓ NORMAL")
            self.lbl_badge.setStyleSheet("color: #10b981; background: #064e3b; border-radius: 4px; padding: 2px 6px;")
            self.lbl_diff.setStyleSheet("color: #10b981; font-weight: bold;")

        self.lbl_pred.setText(f"{pred:.1f} kWh")
        self.lbl_act.setText(f"{act:.1f} kWh")
        sign = "+" if diff >= 0 else ""
        self.lbl_diff.setText(f"{sign}{diff:.1f} kWh")
        self.lbl_driver.setText(f"⚡ {driver}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN WINDOW
# ─────────────────────────────────────────────────────────────────────────────

FLOOR_ACCENTS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"]

class BemsMainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Apex Corporate Tower — BEMS AI Monitor")
        self.resize(1200, 820)
        self.setMinimumSize(980, 660)
        self.setStyleSheet(BASE_STYLESHEET)

        self.creds = Credentials()
        self.latest_data = None
        self.selected_floor = "floor-1"

        self._build_ui()

        # Polling thread
        self._poll_thread = PollingThread(self.creds.api_url, interval=1.0)
        self._poll_thread.data_received.connect(self._on_data)
        self._poll_thread.error_received.connect(self._on_error)
        self._poll_thread.start()

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # ── HEADER BAR ──────────────────────────────────────────────────────
        root_layout.addWidget(self._build_header())

        # ── TABS ────────────────────────────────────────────────────────────
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        root_layout.addWidget(self.tabs, stretch=1)

        self.tabs.addTab(self._build_overview_tab(), "  🏢  Building Overview  ")
        self.tabs.addTab(self._build_inspector_tab(), "  🎛  Zone Inspector  ")
        self.tabs.addTab(self._build_actions_tab(), "  ⚡  Energy Actions  ")
        self.tabs.addTab(self._build_settings_tab(), "  ⚙  Credentials & Settings  ")

        # ── STATUS BAR ──────────────────────────────────────────────────────
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.lbl_status_left = QLabel("  ● Connecting to backend...")
        self.lbl_status_left.setStyleSheet(f"color: {PALETTE['text_muted']};")
        self.lbl_status_right = QLabel("BEMS v2.0 · SVR + SHAP · 1 Building · 4 Floors · 24 Zones  ")
        self.lbl_status_right.setStyleSheet(f"color: {PALETTE['text_dimmed']};")
        self.status_bar.addWidget(self.lbl_status_left, 1)
        self.status_bar.addPermanentWidget(self.lbl_status_right)

    def _build_header(self):
        hdr = QWidget()
        hdr.setObjectName("header")
        hdr.setStyleSheet(f"""
            QWidget#header {{
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                    stop:0 #0f172a, stop:0.5 #1e1b4b, stop:1 #0f172a);
                border-bottom: 1px solid {PALETTE['border']};
            }}
        """)
        hdr.setFixedHeight(64)

        layout = QHBoxLayout(hdr)
        layout.setContentsMargins(16, 0, 16, 0)
        layout.setSpacing(12)

        # Logo area
        logo_box = QHBoxLayout()
        logo_box.setSpacing(8)

        icon_lbl = QLabel("⚡")
        icon_lbl.setFont(QFont("Segoe UI", 20))
        icon_lbl.setStyleSheet("color: #f59e0b;")
        logo_box.addWidget(icon_lbl)

        title_box = QVBoxLayout()
        title_box.setSpacing(1)

        t1 = QLabel("Apex Corporate Tower")
        t1.setFont(QFont("Segoe UI", 13, QFont.Bold))
        t1.setStyleSheet("color: #f8fafc;")

        t2 = QLabel("BEMS AI Monitor · SVR Prediction · SHAP Explainability")
        t2.setFont(QFont("Segoe UI", 8))
        t2.setStyleSheet(f"color: {PALETTE['text_muted']};")

        title_box.addWidget(t1)
        title_box.addWidget(t2)
        logo_box.addLayout(title_box)

        # Badges
        badges = [("SVR Model", PALETTE["blue"]), ("SHAP AI", PALETTE["purple"]),
                  ("4 Floors", PALETTE["emerald"]), ("24 Zones", PALETTE["teal"])]
        for txt, clr in badges:
            b = QLabel(txt)
            b.setFont(QFont("Segoe UI", 7, QFont.Bold))
            b.setStyleSheet(f"color: {clr}; background: {clr}22; border: 1px solid {clr}55; border-radius: 4px; padding: 2px 7px;")
            logo_box.addWidget(b)

        layout.addLayout(logo_box, stretch=1)

        # Controls
        self.lbl_conn_pill = QLabel("  ● Connecting...")
        self.lbl_conn_pill.setFont(QFont("Segoe UI", 9, QFont.Bold))
        self.lbl_conn_pill.setStyleSheet(f"color: {PALETTE['text_muted']}; background: {PALETTE['bg_card']}; border-radius: 5px; padding: 4px 10px;")

        self.btn_toggle_stream = QPushButton("⚡ Streaming")
        self.btn_toggle_stream.setObjectName("btnEmerald")
        self.btn_toggle_stream.setFixedHeight(32)
        self.btn_toggle_stream.setCursor(Qt.PointingHandCursor)
        self.btn_toggle_stream.clicked.connect(self._toggle_stream)

        btn_tick = QPushButton("Tick")
        btn_tick.setObjectName("btnSlate")
        btn_tick.setFixedHeight(32)
        btn_tick.setFixedWidth(52)
        btn_tick.setCursor(Qt.PointingHandCursor)
        btn_tick.clicked.connect(self._trigger_tick)

        btn_sync = QPushButton("  ↻  Sync Now")
        btn_sync.setObjectName("btnPrimary")
        btn_sync.setFixedHeight(32)
        btn_sync.setCursor(Qt.PointingHandCursor)
        btn_sync.clicked.connect(self._fetch_now)

        for w in [self.lbl_conn_pill, self.btn_toggle_stream, btn_tick, btn_sync]:
            layout.addWidget(w)

        return hdr

    # ─── TAB 1: BUILDING OVERVIEW ──────────────────────────────────────────

    def _build_overview_tab(self):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(12)

        # ── KPI Row ────────────────────────────────────────────────────────
        kpi_row = QHBoxLayout()
        kpi_row.setSpacing(10)

        self.kpi_pred = MetricCard("SVR Predicted  (E_pred)", PALETTE["blue"])
        self.kpi_act = MetricCard("1-Hour Actual  (E_actual)", PALETTE["amber"])
        self.kpi_diff = MetricCard("Δ Net Difference", PALETTE["rose"])
        self.kpi_shap = MetricCard("Top SHAP Driver", PALETTE["purple"])
        self.kpi_savings = MetricCard("Savings Potential", PALETTE["teal"])

        for kpi in [self.kpi_pred, self.kpi_act, self.kpi_diff, self.kpi_shap, self.kpi_savings]:
            kpi_row.addWidget(kpi)
        layout.addLayout(kpi_row)

        # ── Status Banner ──────────────────────────────────────────────────
        self.banner = QLabel("  BUILDING STATUS: NORMAL EFFICIENCY")
        self.banner.setFont(QFont("Segoe UI", 11, QFont.Bold))
        self.banner.setAlignment(Qt.AlignCenter)
        self.banner.setFixedHeight(36)
        self.banner.setStyleSheet("""
            background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #064e3b,stop:1 #065f46);
            color: #6ee7b7;
            border-radius: 6px;
            border: 1px solid #10b981;
        """)
        layout.addWidget(self.banner)

        # ── 4 Floor Cards ──────────────────────────────────────────────────
        floors_label = QLabel("  4 FLOORS ENERGY MONITOR")
        floors_label.setFont(QFont("Segoe UI", 10, QFont.Bold))
        floors_label.setStyleSheet(f"color: {PALETTE['text_muted']}; border-left: 3px solid {PALETTE['blue']}; padding-left: 8px;")
        layout.addWidget(floors_label)

        floor_grid = QHBoxLayout()
        floor_grid.setSpacing(10)
        self.floor_cards = {}

        for i in range(1, 5):
            accent = FLOOR_ACCENTS[i - 1]
            fc = FloorCard(i, accent=accent)
            fc.inspect_signal.connect(self._jump_to_inspector)
            floor_grid.addWidget(fc)
            self.floor_cards[i] = fc

        layout.addLayout(floor_grid, stretch=1)

        # ── Quick Actions ──────────────────────────────────────────────────
        qa_group = QGroupBox("  ⚡  Top Energy-Saving Actions")
        qa_layout = QVBoxLayout(qa_group)
        qa_layout.setSpacing(0)

        self.tbl_overview_actions = self._make_action_table()
        qa_layout.addWidget(self.tbl_overview_actions)

        layout.addWidget(qa_group)

        return w

    def _make_action_table(self):
        cols = ["Floor", "Zone Instance", "Targeted Recommendation", "Root Cause (SHAP)", "Est. Power Saving"]
        tbl = QTableWidget(0, len(cols))
        tbl.setHorizontalHeaderLabels(cols)
        tbl.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        tbl.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        tbl.horizontalHeader().setSectionResizeMode(2, QHeaderView.Stretch)
        tbl.horizontalHeader().setSectionResizeMode(3, QHeaderView.Stretch)
        tbl.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeToContents)
        tbl.verticalHeader().setVisible(False)
        tbl.setEditTriggers(QTableWidget.NoEditTriggers)
        tbl.setSelectionBehavior(QTableWidget.SelectRows)
        tbl.setAlternatingRowColors(True)
        tbl.setStyleSheet(f"""
            QTableWidget {{ alternate-background-color: #263248; }}
        """)
        tbl.setFixedHeight(160)
        return tbl

    # ─── TAB 2: ZONE INSPECTOR ─────────────────────────────────────────────

    def _build_inspector_tab(self):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        # Floor selector
        sel_bar = QWidget()
        sel_bar.setStyleSheet(f"background: {PALETTE['bg_card']}; border-radius: 8px; border: 1px solid {PALETTE['border']};")
        sel_layout = QHBoxLayout(sel_bar)
        sel_layout.setContentsMargins(12, 8, 12, 8)
        sel_layout.setSpacing(8)

        lbl = QLabel("Select Floor to Inspect:")
        lbl.setFont(QFont("Segoe UI", 10, QFont.Bold))
        lbl.setStyleSheet("color: #f8fafc;")
        sel_layout.addWidget(lbl)

        self.floor_btns = {}
        for i in range(1, 5):
            btn = QPushButton(f" Floor {i} ")
            btn.setObjectName("btnSlate" if i != 1 else "btnPrimary")
            btn.setCursor(Qt.PointingHandCursor)
            btn.setCheckable(True)
            btn.setChecked(i == 1)
            btn.clicked.connect(lambda _, idx=i: self._select_floor(idx))
            sel_layout.addWidget(btn)
            self.floor_btns[i] = btn

        sel_layout.addStretch()

        self.lbl_floor_name = QLabel("Floor 1 — Executive & Operations")
        self.lbl_floor_name.setFont(QFont("Segoe UI", 9))
        self.lbl_floor_name.setStyleSheet(f"color: {PALETTE['blue']};")
        sel_layout.addWidget(self.lbl_floor_name)

        layout.addWidget(sel_bar)

        # Zone KPIs for selected floor
        f_kpi_row = QHBoxLayout()
        f_kpi_row.setSpacing(8)
        self.f_kpi_pred = MetricCard("Floor Predicted", PALETTE["blue"])
        self.f_kpi_pred.setFixedHeight(85)
        self.f_kpi_act = MetricCard("Floor Actual", PALETTE["amber"])
        self.f_kpi_act.setFixedHeight(85)
        self.f_kpi_diff = MetricCard("Floor Δ Diff", PALETTE["rose"])
        self.f_kpi_diff.setFixedHeight(85)
        self.f_kpi_status = MetricCard("Floor Status", PALETTE["emerald"])
        self.f_kpi_status.setFixedHeight(85)
        self.f_kpi_driver = MetricCard("Top SHAP Driver", PALETTE["purple"])
        self.f_kpi_driver.setFixedHeight(85)

        for kpi in [self.f_kpi_pred, self.f_kpi_act, self.f_kpi_diff, self.f_kpi_status, self.f_kpi_driver]:
            f_kpi_row.addWidget(kpi)
        layout.addLayout(f_kpi_row)

        # Zone table
        zone_group = QGroupBox("  6 Zone Instances (4 Offices + 2 Meeting Halls) — Feature Breakdown")
        zone_layout = QVBoxLayout(zone_group)

        zone_cols = ["Zone", "Type", "Occupancy", "Temp (°C)", "HVAC", "Lights",
                     "E_pred", "E_actual", "Δ Diff", "Status", "SHAP Driver", "Recommended Action"]
        self.tbl_zones = QTableWidget(0, len(zone_cols))
        self.tbl_zones.setHorizontalHeaderLabels(zone_cols)
        self.tbl_zones.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.tbl_zones.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        for col in range(2, 8):
            self.tbl_zones.horizontalHeader().setSectionResizeMode(col, QHeaderView.ResizeToContents)
        self.tbl_zones.horizontalHeader().setSectionResizeMode(8, QHeaderView.ResizeToContents)
        self.tbl_zones.horizontalHeader().setSectionResizeMode(9, QHeaderView.ResizeToContents)
        self.tbl_zones.horizontalHeader().setSectionResizeMode(10, QHeaderView.ResizeToContents)
        self.tbl_zones.horizontalHeader().setSectionResizeMode(11, QHeaderView.Stretch)
        self.tbl_zones.verticalHeader().setVisible(False)
        self.tbl_zones.setEditTriggers(QTableWidget.NoEditTriggers)
        self.tbl_zones.setSelectionBehavior(QTableWidget.SelectRows)
        self.tbl_zones.setAlternatingRowColors(True)
        self.tbl_zones.setStyleSheet(f"QTableWidget {{ alternate-background-color: #263248; }}")

        zone_layout.addWidget(self.tbl_zones)
        layout.addWidget(zone_group, stretch=1)

        return w

    # ─── TAB 3: ENERGY ACTIONS ─────────────────────────────────────────────

    def _build_actions_tab(self):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        # Info banner
        info = QWidget()
        info.setStyleSheet(f"background: #451a03; border-radius: 8px; border: 1px solid {PALETTE['amber']};")
        info_layout = QVBoxLayout(info)
        info_layout.setContentsMargins(14, 10, 14, 10)

        lbl1 = QLabel("⚡  Floor-Level Energy Reduction Action Center")
        lbl1.setFont(QFont("Segoe UI", 11, QFont.Bold))
        lbl1.setStyleSheet(f"color: {PALETTE['amber']};")

        lbl2 = QLabel("SHAP-identified actions to cut energy waste across all 24 zones. "
                      "Threshold: ΔE > 3.5 kWh/zone → flagged as 'Energy Usage Increasing'.")
        lbl2.setFont(QFont("Segoe UI", 9))
        lbl2.setStyleSheet("color: #fde68a;")
        lbl2.setWordWrap(True)

        info_layout.addWidget(lbl1)
        info_layout.addWidget(lbl2)
        layout.addWidget(info)

        # Summary row
        summ_row = QHBoxLayout()
        summ_row.setSpacing(10)
        self.act_kpi_count = MetricCard("Total Actions", PALETTE["rose"])
        self.act_kpi_count.setFixedHeight(80)
        self.act_kpi_power = MetricCard("Total Estimated Saving", PALETTE["emerald"])
        self.act_kpi_power.setFixedHeight(80)
        self.act_kpi_cost = MetricCard("Est. Monthly Cost Saving", PALETTE["teal"])
        self.act_kpi_cost.setFixedHeight(80)
        for k in [self.act_kpi_count, self.act_kpi_power, self.act_kpi_cost]:
            summ_row.addWidget(k)
        layout.addLayout(summ_row)

        # Full actions table
        act_group = QGroupBox("  All Energy-Saving Recommendations (Ordered by Highest Saving)")
        act_layout = QVBoxLayout(act_group)

        cols_a = ["Floor", "Zone Instance", "Targeted Action", "Root Cause (SHAP)", "Est. Power Saving", "Est. Monthly $"]
        self.tbl_actions = QTableWidget(0, len(cols_a))
        self.tbl_actions.setHorizontalHeaderLabels(cols_a)
        self.tbl_actions.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.tbl_actions.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.tbl_actions.horizontalHeader().setSectionResizeMode(2, QHeaderView.Stretch)
        self.tbl_actions.horizontalHeader().setSectionResizeMode(3, QHeaderView.Stretch)
        self.tbl_actions.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeToContents)
        self.tbl_actions.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeToContents)
        self.tbl_actions.verticalHeader().setVisible(False)
        self.tbl_actions.setEditTriggers(QTableWidget.NoEditTriggers)
        self.tbl_actions.setSelectionBehavior(QTableWidget.SelectRows)
        self.tbl_actions.setAlternatingRowColors(True)
        self.tbl_actions.setStyleSheet(f"QTableWidget {{ alternate-background-color: #263248; }}")
        act_layout.addWidget(self.tbl_actions)
        layout.addWidget(act_group, stretch=1)

        return w

    # ─── TAB 4: SETTINGS & CREDENTIALS ────────────────────────────────────

    def _build_settings_tab(self):
        w = QWidget()
        layout = QVBoxLayout(w)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(12)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; }")
        inner = QWidget()
        inner_layout = QVBoxLayout(inner)
        inner_layout.setSpacing(12)
        scroll.setWidget(inner)
        layout.addWidget(scroll)

        # ── PostgreSQL Credentials ─────────────────────────────────────────
        pg_group = QGroupBox("  PostgreSQL Database Credentials")
        pg_form = QFormLayout(pg_group)
        pg_form.setSpacing(8)

        self.ent_pg_host = QLineEdit(self.creds.postgres_host)
        self.ent_pg_port = QLineEdit(str(self.creds.postgres_port))
        self.ent_pg_db = QLineEdit(self.creds.postgres_db)
        self.ent_pg_user = QLineEdit(self.creds.postgres_user)
        self.ent_pg_pass = QLineEdit(self.creds.postgres_password)
        self.ent_pg_pass.setEchoMode(QLineEdit.Password)

        pg_form.addRow("Host:", self.ent_pg_host)
        pg_form.addRow("Port:", self.ent_pg_port)
        pg_form.addRow("Database:", self.ent_pg_db)
        pg_form.addRow("Username:", self.ent_pg_user)
        pg_form.addRow("Password:", self.ent_pg_pass)

        self.lbl_db_status = QLabel("Status: Checking connection...")
        self.lbl_db_status.setFont(QFont("Segoe UI", 9))
        self.lbl_db_status.setStyleSheet(f"color: {PALETTE['text_muted']}; padding-top: 4px;")
        pg_form.addRow("Status:", self.lbl_db_status)

        btn_test_pg = QPushButton("  Test PostgreSQL Connection")
        btn_test_pg.setObjectName("btnPrimary")
        btn_test_pg.setCursor(Qt.PointingHandCursor)
        btn_test_pg.clicked.connect(self._test_pg_connection)
        pg_form.addRow("", btn_test_pg)

        inner_layout.addWidget(pg_group)

        # ── REST API Configuration ─────────────────────────────────────────
        api_group = QGroupBox("  REST API & Telemetry Stream Configuration")
        api_form = QFormLayout(api_group)
        api_form.setSpacing(8)

        self.ent_api_url = QLineEdit(self.creds.api_url)
        api_form.addRow("Backend API URL:", self.ent_api_url)

        btn_update_api = QPushButton("  Update & Reconnect")
        btn_update_api.setObjectName("btnEmerald")
        btn_update_api.setCursor(Qt.PointingHandCursor)
        btn_update_api.clicked.connect(self._update_api_url)
        api_form.addRow("", btn_update_api)

        inner_layout.addWidget(api_group)

        # ── Gemini AI Credentials ──────────────────────────────────────────
        ai_group = QGroupBox("  Gemini AI API Credentials (Optional)")
        ai_form = QFormLayout(ai_group)
        ai_form.setSpacing(8)

        self.ent_gemini = QLineEdit(self.creds.gemini_api_key)
        self.ent_gemini.setEchoMode(QLineEdit.Password)
        ai_form.addRow("Gemini API Key:", self.ent_gemini)
        inner_layout.addWidget(ai_group)

        # ── Energy System Parameters ───────────────────────────────────────
        params_group = QGroupBox("  Energy System Parameters")
        params_form = QFormLayout(params_group)
        params_form.setSpacing(8)

        self.ent_tariff = QLineEdit(str(self.creds.electricity_tariff))
        self.ent_zone_thresh = QLineEdit(str(self.creds.zone_threshold_kw))
        self.ent_floor_thresh = QLineEdit(str(self.creds.floor_threshold_kw))

        params_form.addRow("Electricity Tariff ($/kWh):", self.ent_tariff)
        params_form.addRow("Zone ΔE Threshold (kWh):", self.ent_zone_thresh)
        params_form.addRow("Floor ΔE Threshold (kWh):", self.ent_floor_thresh)

        btn_save = QPushButton("  Save Parameters to .env")
        btn_save.setObjectName("btnAmber")
        btn_save.setCursor(Qt.PointingHandCursor)
        btn_save.clicked.connect(self._save_to_env)
        params_form.addRow("", btn_save)

        inner_layout.addWidget(params_group)
        inner_layout.addStretch()

        return w

    # ─── DATA UPDATE ───────────────────────────────────────────────────────

    def _on_data(self, data):
        self.latest_data = data
        self.lbl_conn_pill.setText("  ● Live Connected")
        self.lbl_conn_pill.setStyleSheet("color: #6ee7b7; background: #064e3b; border-radius: 5px; padding: 4px 10px;")
        self.lbl_status_left.setText("  ● Live Connected · Auto-polling every 1.0s")
        self._update_kpis(data)
        self._update_floor_cards(data)
        self._update_actions(data)
        self._update_zone_inspector(data)
        db = data.get("database", {})
        self.lbl_db_status.setText(db.get("status_message", "In-memory persistence active"))

    def _on_error(self, err):
        self.lbl_conn_pill.setText("  ● Backend Offline")
        self.lbl_conn_pill.setStyleSheet(f"color: {PALETTE['rose']}; background: #4c0519; border-radius: 5px; padding: 4px 10px;")
        self.lbl_status_left.setText(f"  ● Backend Offline — {self.creds.api_url}/api/gui/summary")

    def _update_kpis(self, data):
        pred = data.get("total_predicted_kw", 0)
        act = data.get("total_actual_kw", 0)
        diff = data.get("difference_kw", act - pred)
        status = data.get("status", "Normal")
        savings = data.get("savings_potential_kw", 0)
        top = data.get("top_shap_driver", {})

        self.kpi_pred.set_value(f"{pred:.1f} kWh")
        self.kpi_pred.set_sub("SVR baseline model estimate")

        self.kpi_act.set_value(f"{act:.1f} kWh", color=PALETTE["amber"])
        self.kpi_act.set_sub("Live 1-hour telemetry aggregate")

        diff_str = f"+{diff:.1f} kWh" if diff >= 0 else f"{diff:.1f} kWh"
        diff_col = PALETTE["rose"] if diff > 3.5 else PALETTE["emerald"]
        self.kpi_diff.set_value(diff_str, color=diff_col)

        increasing = "Increasing" in status or diff > 8
        if increasing:
            self.kpi_diff.set_sub("⚠ Energy Usage Increasing", color=PALETTE["rose"])
            self.banner.setText("  ⚠  BUILDING STATUS: ENERGY USAGE INCREASING — Action Required")
            self.banner.setStyleSheet("""
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #4c0519,stop:1 #7f1d1d);
                color: #fda4af; border-radius: 6px; border: 1px solid #f43f5e;
            """)
        else:
            self.kpi_diff.set_sub("✓ Normal Efficiency", color=PALETTE["emerald"])
            self.banner.setText("  ✓  BUILDING STATUS: NORMAL EFFICIENCY")
            self.banner.setStyleSheet("""
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #064e3b,stop:1 #065f46);
                color: #6ee7b7; border-radius: 6px; border: 1px solid #10b981;
            """)

        feat = top.get("feature", "HVAC Status")
        impact = top.get("total_impact_kw", 0)
        self.kpi_shap.set_value(feat, color=PALETTE["purple"])
        self.kpi_shap.set_sub(f"Adding +{impact:.1f} kWh to peak load")

        self.kpi_savings.set_value(f"{savings:.1f} kW", color=PALETTE["teal"])
        cost = data.get("monthly_savings_cost", 0)
        self.kpi_savings.set_sub(f"≈ ${cost:.0f}/month potential")

    def _update_floor_cards(self, data):
        floors = data.get("floors", [])
        for idx, fl in enumerate(floors, 1):
            if idx in self.floor_cards:
                self.floor_cards[idx].update_floor(fl)

    def _update_actions(self, data):
        actions = data.get("key_actions", [])

        # Sort by saving (desc)
        actions_sorted = sorted(actions, key=lambda a: a.get("saving_kw", 0) or 0, reverse=True)

        # Overview quick table (top 5)
        self.tbl_overview_actions.setRowCount(0)
        for act in actions_sorted[:5]:
            row = self.tbl_overview_actions.rowCount()
            self.tbl_overview_actions.insertRow(row)
            fl_name = act.get("floor", "")[:28]
            zone_name = act.get("zone", "")[:25]
            action_txt = act.get("action", "")
            reason = act.get("reason", "")
            saving = act.get("saving_kw", 0)
            self._set_tbl_row(self.tbl_overview_actions, row,
                              [fl_name, zone_name, action_txt, reason, f"-{saving:.1f} kW"])
            if saving and saving > 8:
                for col in range(5):
                    item = self.tbl_overview_actions.item(row, col)
                    if item:
                        item.setForeground(QColor(PALETTE["rose"]))

        # Full actions table
        self.tbl_actions.setRowCount(0)
        total_saving_kw = 0
        total_cost = 0
        for act in actions_sorted:
            row = self.tbl_actions.rowCount()
            self.tbl_actions.insertRow(row)
            saving = act.get("saving_kw", 0) or 0
            cost = act.get("saving_cost", 0) or 0
            total_saving_kw += saving
            total_cost += cost
            self._set_tbl_row(self.tbl_actions, row, [
                act.get("floor", "")[:28],
                act.get("zone", "")[:25],
                act.get("action", ""),
                act.get("reason", ""),
                f"-{saving:.1f} kW",
                f"${cost:.0f}/mo" if cost else "—"
            ])

        self.act_kpi_count.set_value(str(len(actions_sorted)))
        self.act_kpi_count.set_sub("zones flagged above threshold")
        self.act_kpi_power.set_value(f"-{total_saving_kw:.1f} kW", color=PALETTE["emerald"])
        self.act_kpi_power.set_sub("if all actions applied now")
        self.act_kpi_cost.set_value(f"${total_cost:.0f}", color=PALETTE["teal"])
        self.act_kpi_cost.set_sub("estimated monthly savings")

    def _update_zone_inspector(self, data):
        floors = data.get("floors", [])
        floor_data = next((f for f in floors if f.get("id") == self.selected_floor), None)
        if not floor_data:
            return

        # Update floor KPIs in inspector tab
        fl_name = floor_data.get("name", self.selected_floor)
        self.lbl_floor_name.setText(fl_name)
        self.f_kpi_pred.set_value(f"{floor_data.get('predicted_kw', 0):.1f} kWh")
        fl_act = floor_data.get("actual_kw", 0)
        self.f_kpi_act.set_value(f"{fl_act:.1f} kWh", color=PALETTE["amber"])
        fl_diff = floor_data.get("difference_kw", 0)
        sign = "+" if fl_diff >= 0 else ""
        diff_col = PALETTE["rose"] if fl_diff > 3.5 else PALETTE["emerald"]
        self.f_kpi_diff.set_value(f"{sign}{fl_diff:.1f} kWh", color=diff_col)
        fl_status = floor_data.get("status", "Normal")
        if "Increasing" in fl_status:
            self.f_kpi_status.set_value("INCREASING", color=PALETTE["rose"])
        else:
            self.f_kpi_status.set_value("NORMAL", color=PALETTE["emerald"])
        self.f_kpi_driver.set_value(floor_data.get("top_driver", "—"), color=PALETTE["purple"])

        # Zone table
        self.tbl_zones.setRowCount(0)
        for z in floor_data.get("zones", []):
            row = self.tbl_zones.rowCount()
            self.tbl_zones.insertRow(row)
            z_diff = z.get("difference_kw", 0)
            z_status = z.get("energy_status", "Normal")
            sign = "+" if z_diff >= 0 else ""
            values = [
                z.get("name", ""),
                z.get("type", "Office"),
                str(z.get("occupancy", 0)),
                f"{z.get('temperature', 22.5):.1f}",
                z.get("hvac_status", "—"),
                z.get("lighting_status", "—"),
                f"{z.get('predicted_kw', 0):.1f} kWh",
                f"{z.get('actual_kw', 0):.1f} kWh",
                f"{sign}{z_diff:.1f} kWh",
                z_status,
                z.get("top_driver", "—"),
                z.get("suggested_action", "—") or "—",
            ]
            self._set_tbl_row(self.tbl_zones, row, values)
            # Color row by status
            increasing = "Increasing" in z_status
            for col in range(self.tbl_zones.columnCount()):
                item = self.tbl_zones.item(row, col)
                if item and increasing:
                    item.setForeground(QColor("#fda4af"))
                elif item:
                    item.setForeground(QColor(PALETTE["text_primary"]))

    def _set_tbl_row(self, tbl, row, values):
        for col, val in enumerate(values):
            item = QTableWidgetItem(str(val))
            item.setFlags(Qt.ItemIsSelectable | Qt.ItemIsEnabled)
            tbl.setItem(row, col, item)

    # ─── CONTROLS ──────────────────────────────────────────────────────────

    def _select_floor(self, floor_num):
        self.selected_floor = f"floor-{floor_num}"
        for i, btn in self.floor_btns.items():
            if i == floor_num:
                btn.setObjectName("btnPrimary")
                btn.setStyleSheet("")
                btn.setStyleSheet(f"background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 {PALETTE['blue']},stop:1 {PALETTE['indigo']}); color: white; border-radius: 6px; padding: 6px 14px; font-weight: 600; font-size: 11px; border: none;")
            else:
                btn.setObjectName("btnSlate")
                btn.setStyleSheet(f"background: {PALETTE['slate']}; color: white; border-radius: 6px; padding: 6px 14px; font-weight: 600; font-size: 11px; border: none;")
        if self.latest_data:
            self._update_zone_inspector(self.latest_data)

    def _jump_to_inspector(self, floor_id):
        num = int(floor_id.split("-")[1])
        self.tabs.setCurrentIndex(1)
        self._select_floor(num)

    def _toggle_stream(self):
        try:
            url = f"{self.creds.api_url}/api/simulation/toggle"
            req = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=2.0)
        except Exception:
            pass

    def _trigger_tick(self):
        try:
            url = f"{self.creds.api_url}/api/simulation/tick"
            req = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=2.0)
        except Exception:
            pass

    def _fetch_now(self):
        worker = DataWorker(self.creds.api_url)
        worker.data_received.connect(self._on_data)
        worker.error_received.connect(self._on_error)
        threading.Thread(target=worker.fetch_once, daemon=True).start()

    def _test_pg_connection(self):
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=self.ent_pg_host.text().strip(),
                port=int(self.ent_pg_port.text().strip()),
                dbname=self.ent_pg_db.text().strip(),
                user=self.ent_pg_user.text().strip(),
                password=self.ent_pg_pass.text().strip(),
                connect_timeout=3,
            )
            conn.close()
            self.lbl_db_status.setText("✓ PostgreSQL Connected Successfully!")
            self.lbl_db_status.setStyleSheet(f"color: {PALETTE['emerald']}; padding-top: 4px;")
        except Exception as e:
            self.lbl_db_status.setText(f"✗ Connection Failed: {str(e)[:80]}")
            self.lbl_db_status.setStyleSheet(f"color: {PALETTE['rose']}; padding-top: 4px;")

    def _update_api_url(self):
        new_url = self.ent_api_url.text().strip()
        self.creds.api_url = new_url
        self._poll_thread.set_api_url(new_url)

    def _save_to_env(self):
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            env_path = os.path.join(base_dir, ".env")
            content = f"""# BEMS Configuration - Auto-saved from Desktop GUI

POSTGRES_HOST={self.ent_pg_host.text().strip()}
POSTGRES_PORT={self.ent_pg_port.text().strip()}
POSTGRES_DB={self.ent_pg_db.text().strip()}
POSTGRES_USER={self.ent_pg_user.text().strip()}
POSTGRES_PASSWORD={self.ent_pg_pass.text().strip()}

PORT=3000
HOST=0.0.0.0
API_URL={self.ent_api_url.text().strip()}

GEMINI_API_KEY={self.ent_gemini.text().strip()}

ELECTRICITY_TARIFF_USD={self.ent_tariff.text().strip()}
ZONE_DEVIATION_THRESHOLD_KW={self.ent_zone_thresh.text().strip()}
FLOOR_DEVIATION_THRESHOLD_KW={self.ent_floor_thresh.text().strip()}
"""
            with open(env_path, "w") as f:
                f.write(content)
            self.lbl_db_status.setText(f"✓ Saved to .env at {env_path}")
            self.lbl_db_status.setStyleSheet(f"color: {PALETTE['emerald']}; padding-top: 4px;")
        except Exception as e:
            self.lbl_db_status.setText(f"✗ Save failed: {e}")

    def closeEvent(self, event):
        self._poll_thread.stop()
        self._poll_thread.wait(1000)
        super().closeEvent(event)


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("BEMS Desktop Monitor")
    app.setStyle("Fusion")
    win = BemsMainWindow()
    win.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
