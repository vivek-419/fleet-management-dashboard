# Fleet Telemetry Dashboard

The **Fleet Telemetry Dashboard** is a real-time monitoring application designed to track and manage the status of a simulated fleet of 20 vehicles (V001 to V020). This project is designed as a foundational, Docker-ready, and production-quality college DevOps project. It will integrate with monitoring and orchestration tools like Docker, Kubernetes, Jenkins, Terraform, Prometheus, Grafana, ELK Stack, and Vault.

---

## Features

1. **Real-Time Simulation**: Simulates speed, fuel, and engine temperature for 20 fleet vehicles.
2. **Alert Engine**: Evaluates rule-based vehicle health statuses dynamically:
   - **Normal**: Fuel $\ge$ 20% and Engine Temperature $\le$ 100°C.
   - **Low Fuel**: Fuel < 20% and Engine Temperature $\le$ 100°C.
   - **Overheating**: Fuel $\ge$ 20% and Engine Temperature > 100°C.
   - **Critical**: Fuel < 20% and Engine Temperature > 100°C.
3. **Responsive UI Dashboard**: Modern UI using Bootstrap 5 and customized dark mode styling, featuring:
   - Dynamic cards showing counts of Total Vehicles, Critical Alerts, Low Fuel Alerts, and Overheating Alerts.
   - A color-coded table listing all vehicle data.
   - Asynchronous auto-refresh every 5 seconds without full-page reloads.
4. **REST API**: Provides a JSON endpoint (`/api/telemetry`) returning current vehicle metrics.
5. **Prometheus Metrics**: Exposes structured metrics (`/metrics`) using `prometheus_client` to track api requests, generated telemetry records, and active vehicles.
6. **Logging**: Writes structured event logs (`INFO`, `WARNING`, `ERROR`) to `logs/app.log`.

---

## Directory Structure

```
fleet-dashboard/
└── backend/
    ├── .env                    # Environment configuration
    ├── app.py                  # Flask web server & routes
    ├── config.py               # Config loader & directory setups
    ├── database.py             # SQLite interface & query logic
    ├── metrics.py              # Prometheus metrics declarations
    ├── requirements.txt        # Python dependency requirements
    ├── Dockerfile              # Production-ready container image
    ├── .dockerignore           # Docker build ignore rules
    ├── telemetry_generator.py  # Simulation loop & rules engine
    │
    ├── data/
    │   └── telemetry.db        # SQLite database file (created on runtime)
    │
    ├── logs/
    │   └── app.log             # Application logs (created on runtime)
    │
    ├── static/
    │   ├── css/
    │   │   └── style.css       # Custom layout, glows, and animations
    │   └── js/
    │       └── dashboard.js    # Client-side AJAX and DOM update engine
    │
    └── templates/
        └── dashboard.html      # Bootstrap 5 Dashboard page
```

---

## Environment Variables

The application supports runtime configuration through environment variables:

```ini
APP_HOST=0.0.0.0
APP_PORT=5001
APP_ENV=production
DB_NAME=data/telemetry.db
LOG_LEVEL=INFO
SIMULATION_INTERVAL=5
```

- Copy the template for local setup:
  ```bash
  cp backend/.env.example backend/.env
  ```
- In Docker Compose, these values are loaded from `backend/.env` and can be overridden in `docker-compose.yml`.

---

## Getting Started

### Prerequisites

- Python 3.8 or higher
- `pip` (Python package manager)

### Installation

1. Navigate to the backend directory:
   ```bash
   cd fleet-dashboard/backend
   ```

2. Create a virtual environment (recommended to avoid global package conflicts):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

---

## Running Locally

1. Create or edit the `.env` file in the `fleet-dashboard/backend/` folder (a default `.env` is already configured for you):
   ```ini
   APP_PORT=5001
   DB_NAME=data/telemetry.db
   LOG_LEVEL=INFO
   SIMULATION_INTERVAL=5
   ```

2. Run the Flask application:
   ```bash
   python app.py
   ```
   *Note: On startup, the server automatically initializes the database (`data/telemetry.db`), starts the telemetry generator in a background thread, and creates the log file (`logs/app.log`).*

3. Open your browser and navigate to:
   ```
   http://localhost:5001
   ```

---

## Docker Setup (Production-Ready)

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

### 1) Build and run with Docker Compose

From the `fleet-dashboard/` directory:

```bash
docker compose up --build -d
```

This will:
- Build image from `backend/Dockerfile`
- Start container `fleet-telemetry-dashboard`
- Expose app on `http://localhost:5001`
- Persist SQLite data/logs via named volumes

### 2) Check container status and health

```bash
docker compose ps
docker inspect --format='{{json .State.Health}}' fleet-telemetry-dashboard
```

### 3) View logs

```bash
docker compose logs -f fleet-dashboard
```

### 4) Stop services

```bash
docker compose down
```

### 5) Stop and remove volumes (fresh reset)

```bash
docker compose down -v
```

### 6) Build and run with plain Docker (optional)

```bash
cd backend
docker build -t fleet-telemetry-dashboard:latest .
docker run -d --name fleet-telemetry-dashboard -p 5001:5001 --env-file .env fleet-telemetry-dashboard:latest
```

### 7) Inspect running container details

```bash
docker ps
docker inspect fleet-telemetry-dashboard
docker exec -it fleet-telemetry-dashboard sh
```

---

## API & Endpoints

### 1. REST API
- **Route**: `GET /api/telemetry`
- **Description**: Returns the latest telemetry details for all 20 vehicles.
- **Response Format**: JSON List
- **Example Response**:
  ```json
  [
    {
      "vehicle_id": "V001",
      "speed": 75,
      "fuel": 15,
      "temperature": 105,
      "status": "Critical",
      "timestamp": "2026-06-15 12:42:45"
    }
  ]
  ```

### 2. Metrics Endpoint
- **Route**: `GET /metrics`
- **Description**: Exposes system and performance statistics for Prometheus scraping.
- **Monitored Metrics**:
  - `api_requests_total`: Counts incoming API calls, labeled by HTTP method, path, and response status.
  - `telemetry_records_total`: Monotonically increasing counter of total simulated telemetry updates.
  - `active_vehicles`: Gauge showing the current number of active reporting vehicles.

### 3. Health Endpoint
- **Route**: `GET /health`
- **Description**: Container/orchestrator probe endpoint validating app responsiveness and DB connectivity.
- **Success Response**: `200` with JSON `{ "status": "healthy", ... }`

### 4. Log Output
- **File**: `logs/app.log`
- **Description**: Displays operations and alert records. Examples:
  ```
  INFO Database initialized successfully.
  INFO Background telemetry simulation thread started.
  INFO Vehicle V001 telemetry updated
  WARNING Vehicle V004 low fuel
  WARNING Vehicle V009 overheating
  WARNING Vehicle V005 critical status (low fuel & overheating)
  ```
