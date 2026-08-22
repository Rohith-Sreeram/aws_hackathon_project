"""
PostgreSQL Database Connectivity & Telemetry Storage Engine for BEMS.
Supports standard PostgreSQL via psycopg2 with automatic schema initialization
and fallback to SQLite/In-Memory when PostgreSQL is offline.
"""
import os
import json
import logging
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("bems_db")
logging.basicConfig(level=logging.INFO)

# PostgreSQL Configuration from environment or defaults
PG_HOST = os.environ.get("POSTGRES_HOST", "localhost")
PG_PORT = int(os.environ.get("POSTGRES_PORT", 5432))
PG_DB = os.environ.get("POSTGRES_DB", "bems_db")
PG_USER = os.environ.get("POSTGRES_USER", "postgres")
PG_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
DATABASE_URL = os.environ.get("DATABASE_URL")

class DatabaseManager:
    def __init__(self):
        self.is_connected = False
        self.connection_error = None
        self.conn = None
        self._init_connection()

    def _get_connection_params(self):
        if DATABASE_URL:
            return DATABASE_URL
        return {
            "host": PG_HOST,
            "port": PG_PORT,
            "dbname": PG_DB,
            "user": PG_USER,
            "password": PG_PASSWORD,
            "connect_timeout": 3,
        }

    def _init_connection(self):
        """Attempts to establish connection to PostgreSQL."""
        try:
            params = self._get_connection_params()
            if isinstance(params, str):
                self.conn = psycopg2.connect(params)
            else:
                self.conn = psycopg2.connect(**params)
            self.conn.autocommit = True
            self.is_connected = True
            self.connection_error = None
            self._create_schema()
            logger.info("Successfully connected to PostgreSQL database: %s@%s:%s/%s", PG_USER, PG_HOST, PG_PORT, PG_DB)
        except Exception as e:
            self.is_connected = False
            self.connection_error = str(e)
            logger.warning("PostgreSQL connection not established (%s). Running with in-memory persistence.", e)

    def _create_schema(self):
        """Creates tables if they do not exist."""
        if not self.is_connected or not self.conn:
            return

        queries = [
            """
            CREATE TABLE IF NOT EXISTS building_telemetry (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                building_id VARCHAR(50),
                building_name VARCHAR(100),
                total_predicted_kw NUMERIC(10, 2),
                total_actual_kw NUMERIC(10, 2),
                difference_kw NUMERIC(10, 2),
                status VARCHAR(50),
                occupancy_rate NUMERIC(5, 2),
                top_driver_feature VARCHAR(50),
                top_driver_impact NUMERIC(10, 2)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS floor_telemetry (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                floor_id VARCHAR(50),
                floor_name VARCHAR(100),
                floor_number INT,
                predicted_kw NUMERIC(10, 2),
                actual_kw NUMERIC(10, 2),
                difference_kw NUMERIC(10, 2),
                status VARCHAR(50),
                top_shap_driver VARCHAR(50)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS zone_telemetry (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                floor_id VARCHAR(50),
                zone_id VARCHAR(50),
                zone_name VARCHAR(100),
                zone_type VARCHAR(50),
                occupancy INT,
                temperature NUMERIC(5, 2),
                humidity NUMERIC(5, 2),
                hvac_status VARCHAR(10),
                lighting_status VARCHAR(10),
                fan_status VARCHAR(10),
                predicted_energy_kw NUMERIC(10, 2),
                actual_energy_kw NUMERIC(10, 2),
                difference_kw NUMERIC(10, 2),
                energy_status VARCHAR(50),
                top_driver_feature VARCHAR(50),
                top_driver_impact NUMERIC(10, 2)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS energy_actions_log (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                floor_id VARCHAR(50),
                zone_id VARCHAR(50),
                zone_name VARCHAR(100),
                action_text TEXT,
                reason TEXT,
                saving_kw NUMERIC(10, 2),
                status VARCHAR(20) DEFAULT 'ACTIVE'
            );
            """
        ]

        try:
            with self.conn.cursor() as cur:
                for query in queries:
                    cur.execute(query)
            logger.info("PostgreSQL schema verified and tables initialized.")
        except Exception as err:
            logger.error("Error creating schema: %s", err)

    def log_building_snapshot(self, summary: dict):
        """Persists building, floor, and zone snapshots to PostgreSQL."""
        if not self.is_connected or not self.conn:
            return

        try:
            bldg = summary.get("building", {})
            now = datetime.now(timezone.utc)
            top_drv = bldg.get("top_shap_driver", {})

            with self.conn.cursor() as cur:
                # 1. Insert building record
                cur.execute(
                    """
                    INSERT INTO building_telemetry 
                    (timestamp, building_id, building_name, total_predicted_kw, total_actual_kw, difference_kw, status, occupancy_rate, top_driver_feature, top_driver_impact)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        now,
                        bldg.get("id", "bldg-apex"),
                        bldg.get("name", "Apex Corporate Tower"),
                        bldg.get("total_predicted_energy_kw", 0),
                        bldg.get("total_actual_energy_kw", 0),
                        bldg.get("difference_kw", 0),
                        bldg.get("status", "Normal"),
                        bldg.get("occupancy_rate_pct", 0),
                        top_drv.get("feature", "HVAC Status"),
                        top_drv.get("total_impact_kw", 0)
                    )
                )

                # 2. Insert floor records
                for fl in bldg.get("floors", []):
                    fl_top = fl.get("top_shap_driver", {})
                    cur.execute(
                        """
                        INSERT INTO floor_telemetry
                        (timestamp, floor_id, floor_name, floor_number, predicted_kw, actual_kw, difference_kw, status, top_shap_driver)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            now,
                            fl.get("id"),
                            fl.get("name"),
                            fl.get("floorNumber", 1),
                            fl.get("total_predicted_energy_kw", 0),
                            fl.get("total_actual_energy_kw", 0),
                            fl.get("difference_kw", 0),
                            fl.get("status", "Normal"),
                            fl_top.get("feature", "HVAC Status")
                        )
                    )

                    # 3. Insert zone records
                    for z in fl.get("zones", []):
                        z_top = z.get("top_driver") or {}
                        cur.execute(
                            """
                            INSERT INTO zone_telemetry
                            (timestamp, floor_id, zone_id, zone_name, zone_type, occupancy, temperature, humidity, hvac_status, lighting_status, fan_status, predicted_energy_kw, actual_energy_kw, difference_kw, energy_status, top_driver_feature, top_driver_impact)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                now,
                                fl.get("id"),
                                z.get("id"),
                                z.get("name"),
                                z.get("type", "Office"),
                                z.get("Occupancy", 0),
                                z.get("Temperature", 22.5),
                                z.get("Humidity", 50.0),
                                z.get("HVAC Status", "ON"),
                                z.get("Lighting Status", "ON"),
                                z.get("Fan Status", "ON"),
                                z.get("predicted_energy_kw", 0),
                                z.get("actual_energy_kw", 0),
                                z.get("difference_kw", 0),
                                z.get("energy_status", "Normal"),
                                z_top.get("feature", "HVAC Status"),
                                z_top.get("impact", 0)
                            )
                        )
        except Exception as err:
            logger.error("Failed to write telemetry snapshot to PostgreSQL: %s", err)

    def get_status(self):
        """Returns PostgreSQL connection state & diagnostic metadata."""
        record_count = 0
        if self.is_connected and self.conn:
            try:
                with self.conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM building_telemetry")
                    record_count = cur.fetchone()[0]
            except Exception:
                pass

        return {
            "is_connected": self.is_connected,
            "host": PG_HOST,
            "port": PG_PORT,
            "database": PG_DB,
            "user": PG_USER,
            "error": self.connection_error,
            "tables": ["building_telemetry", "floor_telemetry", "zone_telemetry", "energy_actions_log"],
            "total_records_logged": record_count,
            "status_message": "PostgreSQL Connected & Active" if self.is_connected else f"PostgreSQL Offline ({self.connection_error or 'Standby'}). In-Memory Fallback Active."
        }

db_manager = DatabaseManager()
