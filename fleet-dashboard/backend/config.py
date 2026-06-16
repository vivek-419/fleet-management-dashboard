import os
from dotenv import load_dotenv

# Load .env file if it exists
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

APP_PORT = int(os.getenv('APP_PORT', 5000))
APP_HOST = os.getenv('APP_HOST', '0.0.0.0')
APP_ENV = os.getenv('APP_ENV', 'production')

# Resolve database path relative to BASE_DIR if it's a relative path
db_env = os.getenv('DB_NAME', 'data/telemetry.db')
if os.path.isabs(db_env):
    DB_PATH = db_env
else:
    DB_PATH = os.path.abspath(os.path.join(BASE_DIR, db_env))

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Simulation Interval in seconds
SIMULATION_INTERVAL = int(os.getenv('SIMULATION_INTERVAL', 5))

# Log settings
LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'app.log')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
