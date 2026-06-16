import os
import logging
import threading
import sqlite3
from flask import Flask, render_template, jsonify, request
from prometheus_client import generate_latest, REGISTRY

from config import APP_PORT, APP_HOST, APP_ENV, LOG_FILE, LOG_LEVEL
from database import init_db, get_latest_telemetry
from telemetry_generator import start_simulation_loop, seed_initial_telemetry
from metrics import API_REQUESTS_TOTAL
from database import get_connection

# Configure logging matching the level and path
logging.basicConfig(
    filename=LOG_FILE,
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(levelname)s %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Register Prometheus middleware to count all requests and statuses
@app.after_request
def track_requests(response):
    # Exclude endpoints that generate high noise, but track api and metrics
    endpoint = request.path
    # Track the request with labels
    API_REQUESTS_TOTAL.labels(
        method=request.method,
        endpoint=endpoint,
        status=response.status_code
    ).inc()
    return response

@app.route('/')
def index():
    """Render the dashboard UI."""
    return render_template('dashboard.html')

@app.route('/api/telemetry')
def get_telemetry():
    """REST API returning latest telemetry for all vehicles in JSON format."""
    try:
        data = get_latest_telemetry()
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error handling /api/telemetry: {e}")
        return jsonify({"error": "Failed to fetch telemetry records"}), 500

@app.route('/metrics')
def metrics():
    """Prometheus metrics endpoint."""
    try:
        # Generate and return standard + custom prometheus metrics
        return generate_latest(REGISTRY), 200, {'Content-Type': 'text/plain; charset=utf-8'}
    except Exception as e:
        logger.error(f"Error serving metrics: {e}")
        return "Internal Server Error", 500

@app.route('/health')
def health():
    """Container and orchestrator health probe endpoint."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
    except sqlite3.Error as exc:
        logger.error(f"Health check failed: {exc}")
        return jsonify({
            "status": "unhealthy",
            "service": "fleet-telemetry-dashboard",
            "environment": APP_ENV
        }), 503

    return jsonify({
        "status": "healthy",
        "service": "fleet-telemetry-dashboard",
        "environment": APP_ENV
    }), 200

# Module-level startup: initialize DB, seed data, then start simulation thread.
# With gunicorn, only the first worker should run the background simulator.
if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
    try:
        init_db()
        seed_initial_telemetry()

        if os.environ.get('RUN_TELEMETRY_SIMULATOR', 'true').lower() == 'true':
            sim_thread = threading.Thread(target=start_simulation_loop, daemon=True)
            sim_thread.start()
            logger.info("Background telemetry simulation thread started.")
    except Exception as exc:
        logger.error(f"Failed to initialize background thread: {exc}")

if __name__ == '__main__':
    logger.info(f"Starting Fleet Telemetry Dashboard on port {APP_PORT}...")
    app.run(host=APP_HOST, port=APP_PORT, debug=False)
