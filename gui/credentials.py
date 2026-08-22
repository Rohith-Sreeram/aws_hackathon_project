"""
GUI Credentials & Configuration Manager.
Loads all credentials from the project's .env file.
This is intentionally SEPARATED from the GUI layout code (gui/app.py).
Edit this file to change connection settings without touching UI code.
"""
import os
from pathlib import Path

def _find_env_file() -> Path:
    """Search up from gui/ to find the project's .env file."""
    current = Path(__file__).resolve().parent
    for _ in range(4):
        candidate = current / ".env"
        if candidate.exists():
            return candidate
        current = current.parent
    return None

def _load_env(path: Path) -> dict:
    """Simple .env parser (no external library required)."""
    env = {}
    if not path:
        return env
    try:
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, val = line.partition("=")
                    env[key.strip()] = val.strip().strip('"').strip("'")
    except Exception:
        pass
    return env


class Credentials:
    """
    Centralized credentials object for the BEMS Desktop GUI.
    Priority: environment variables > .env file > hardcoded defaults.
    """

    def __init__(self):
        self._env_path = _find_env_file()
        self._env = _load_env(self._env_path)

    def _get(self, key: str, default: str = "") -> str:
        """Read from OS env first, then .env file, then default."""
        return os.environ.get(key, self._env.get(key, default))

    # ─── PostgreSQL Database ──────────────────────────────────────────────

    @property
    def postgres_host(self) -> str:
        return self._get("POSTGRES_HOST", "localhost")

    @property
    def postgres_port(self) -> int:
        return int(self._get("POSTGRES_PORT", "5432"))

    @property
    def postgres_db(self) -> str:
        return self._get("POSTGRES_DB", "bems_db")

    @property
    def postgres_user(self) -> str:
        return self._get("POSTGRES_USER", "postgres")

    @property
    def postgres_password(self) -> str:
        return self._get("POSTGRES_PASSWORD", "postgres")

    @property
    def database_url(self) -> str:
        return self._get("DATABASE_URL", "")

    # ─── REST API ─────────────────────────────────────────────────────────

    @property
    def api_url(self) -> str:
        return self._api_url_override or self._get("API_URL", "http://localhost:3000")

    @api_url.setter
    def api_url(self, value: str):
        self._api_url_override = value

    _api_url_override: str = None

    # ─── Gemini AI ────────────────────────────────────────────────────────

    @property
    def gemini_api_key(self) -> str:
        return self._get("GEMINI_API_KEY", "")

    # ─── Energy Parameters ────────────────────────────────────────────────

    @property
    def electricity_tariff(self) -> float:
        return float(self._get("ELECTRICITY_TARIFF_USD", "0.18"))

    @property
    def zone_threshold_kw(self) -> float:
        return float(self._get("ZONE_DEVIATION_THRESHOLD_KW", "3.5"))

    @property
    def floor_threshold_kw(self) -> float:
        return float(self._get("FLOOR_DEVIATION_THRESHOLD_KW", "12.0"))

    # ─── Debug Info ───────────────────────────────────────────────────────

    def summary(self) -> dict:
        return {
            "env_file": str(self._env_path) if self._env_path else "Not found (using defaults)",
            "postgres_host": self.postgres_host,
            "postgres_port": self.postgres_port,
            "postgres_db": self.postgres_db,
            "postgres_user": self.postgres_user,
            "api_url": self.api_url,
            "has_gemini_key": bool(self.gemini_api_key),
            "electricity_tariff": self.electricity_tariff,
            "zone_threshold_kw": self.zone_threshold_kw,
        }


# Quick test when run directly
if __name__ == "__main__":
    creds = Credentials()
    import pprint
    print("BEMS Credentials Summary:")
    pprint.pprint(creds.summary())
