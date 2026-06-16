import os

bind = f"0.0.0.0:{os.getenv('APP_PORT', '5001')}"
workers = 1
threads = 4
timeout = 120

def post_fork(server, worker):
    """Run telemetry simulator in only one worker to avoid duplicate loops."""
    os.environ["RUN_TELEMETRY_SIMULATOR"] = "true" if worker.age == 1 else "false"
