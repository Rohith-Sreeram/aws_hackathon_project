"""
Centralized Configuration & Credentials Manager for BEMS.
Loads environment variables from .env file securely.
"""
import os
from dotenv import load_dotenv

# Find root directory containing .env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")

if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    load_dotenv()

class Config:
    # -------------------------------------------------------------------------
    # 1. PostgreSQL Database Credentials
    # -------------------------------------------------------------------------
    POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = int(os.environ.get("POSTGRES_PORT", 5432))
    POSTGRES_DB = os.environ.get("POSTGRES_DB", "bems_db")
    POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
    DATABASE_URL = os.environ.get("DATABASE_URL")

    # -------------------------------------------------------------------------
    # 2. Server & REST API Configuration
    # -------------------------------------------------------------------------
    PORT = int(os.environ.get("PORT", 3000))
    HOST = os.environ.get("HOST", "0.0.0.0")
    API_URL = os.environ.get("API_URL", f"http://localhost:{PORT}")

    # -------------------------------------------------------------------------
    # 3. AI / Gemini API Credentials
    # -------------------------------------------------------------------------
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

    # -------------------------------------------------------------------------
    # 4. Energy Parameters & Thresholds
    # -------------------------------------------------------------------------
    ELECTRICITY_TARIFF = float(os.environ.get("ELECTRICITY_TARIFF_USD", 0.18))
    MIN_COMFORT_TEMP = float(os.environ.get("MIN_COMFORT_TEMP", 20.0))
    MAX_COMFORT_TEMP = float(os.environ.get("MAX_COMFORT_TEMP", 25.5))
    WORK_HOURS_START = int(os.environ.get("WORK_HOURS_START", 8))
    WORK_HOURS_END = int(os.environ.get("WORK_HOURS_END", 18))
    ZONE_THRESHOLD_KW = float(os.environ.get("ZONE_DEVIATION_THRESHOLD_KW", 3.5))
    FLOOR_THRESHOLD_KW = float(os.environ.get("FLOOR_DEVIATION_THRESHOLD_KW", 12.0))

    @classmethod
    def get_postgres_params(cls):
        if cls.DATABASE_URL:
            return cls.DATABASE_URL
        return {
            "host": cls.POSTGRES_HOST,
            "port": cls.POSTGRES_PORT,
            "dbname": cls.POSTGRES_DB,
            "user": cls.POSTGRES_USER,
            "password": cls.POSTGRES_PASSWORD,
            "connect_timeout": 3,
        }

config = Config()
