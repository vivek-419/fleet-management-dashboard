import sqlite3
import logging
from config import DB_PATH

logger = logging.getLogger(__name__)

def get_connection():
    """Establish and return an SQLite database connection."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        logger.error(f"Failed to connect to database at {DB_PATH}: {e}")
        raise

def init_db():
    """Initialize the database by creating the telemetry table and indexes if they do not exist."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Check if table exists and has new columns
        cursor.execute("PRAGMA table_info(telemetry)")
        cols = [row['name'] for row in cursor.fetchall()]
        
        # If table exists but lacks new columns, drop it to migrate
        if cols and 'driver' not in cols:
            logger.info("Outdated database schema detected. Re-creating telemetry table...")
            cursor.execute("DROP TABLE telemetry")
            conn.commit()

        # Create table with all required columns
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id TEXT NOT NULL,
                speed INTEGER NOT NULL,
                fuel INTEGER NOT NULL,
                temperature INTEGER NOT NULL,
                status TEXT NOT NULL,
                battery INTEGER NOT NULL DEFAULT 100,
                latitude REAL,
                longitude REAL,
                region TEXT,
                location TEXT,
                driver TEXT,
                health INTEGER NOT NULL DEFAULT 100,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for optimized queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_id_id 
            ON telemetry(vehicle_id, id DESC)
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def insert_telemetry(vehicle_id, speed, fuel, temperature, status, battery, latitude, longitude, region, location, driver, health):
    """Insert a new vehicle telemetry record."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO telemetry (vehicle_id, speed, fuel, temperature, status, battery, latitude, longitude, region, location, driver, health)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (vehicle_id, speed, fuel, temperature, status, battery, latitude, longitude, region, location, driver, health))
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        logger.error(f"Failed to insert telemetry for vehicle {vehicle_id}: {e}")
        raise

def get_latest_telemetry():
    """Retrieve the latest telemetry record for each vehicle."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Subquery to find the maximum id for each vehicle_id, then join to get full records.
        cursor.execute('''
            SELECT t.vehicle_id, t.speed, t.fuel, t.temperature, t.status, t.battery, t.latitude, t.longitude, t.region, t.location, t.driver, t.health, t.timestamp
            FROM telemetry t
            INNER JOIN (
                SELECT vehicle_id, MAX(id) as max_id
                FROM telemetry
                GROUP BY vehicle_id
            ) latest ON t.id = latest.max_id
            ORDER BY t.vehicle_id ASC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        logger.error(f"Failed to query latest telemetry: {e}")
        return []
