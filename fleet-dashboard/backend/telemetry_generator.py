import time
import random
import logging
from config import SIMULATION_INTERVAL, LOG_FILE, LOG_LEVEL
from database import init_db, insert_telemetry, get_latest_telemetry
from metrics import TELEMETRY_RECORDS_TOTAL, ACTIVE_VEHICLES

# Configure logging according to the format: "LEVEL message" (e.g. "INFO Vehicle V001 telemetry updated")
logging.basicConfig(
    filename=LOG_FILE,
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(levelname)s %(message)s'
)

VEHICLE_BASES = {
    "V001": {"region": "North America", "location": "New York", "lat": 40.7128, "lon": -74.0060, "driver": "James Chen"},
    "V002": {"region": "North America", "location": "Los Angeles", "lat": 34.0522, "lon": -118.2437, "driver": "Maria Santos"},
    "V003": {"region": "North America", "location": "Chicago", "lat": 41.8781, "lon": -87.6298, "driver": "David Okonkwo"},
    "V004": {"region": "North America", "location": "Houston", "lat": 29.7604, "lon": -95.3698, "driver": "Elena Volkov"},
    "V005": {"region": "North America", "location": "Toronto", "lat": 43.6532, "lon": -79.3832, "driver": "Raj Patel"},
    "V006": {"region": "Europe", "location": "London", "lat": 51.5074, "lon": -0.1278, "driver": "Sarah Mitchell"},
    "V007": {"region": "Europe", "location": "Paris", "lat": 48.8566, "lon": 2.3522, "driver": "Ahmed Hassan"},
    "V008": {"region": "Europe", "location": "Berlin", "lat": 52.5200, "lon": 13.4050, "driver": "Yuki Tanaka"},
    "V009": {"region": "Europe", "location": "Rome", "lat": 41.9028, "lon": 12.4964, "driver": "Carlos Rivera"},
    "V010": {"region": "Europe", "location": "Madrid", "lat": 40.4168, "lon": -3.7038, "driver": "Fatima Al-Rashid"},
    "V011": {"region": "Asia", "location": "Tokyo", "lat": 35.6762, "lon": 139.6503, "driver": "Liam O'Brien"},
    "V012": {"region": "Asia", "location": "Seoul", "lat": 37.5665, "lon": 126.9780, "driver": "Priya Sharma"},
    "V013": {"region": "Asia", "location": "Beijing", "lat": 39.9042, "lon": 116.4074, "driver": "Marcus Johnson"},
    "V014": {"region": "Asia", "location": "Singapore", "lat": 1.3521, "lon": 103.8198, "driver": "Sofia Andersson"},
    "V015": {"region": "Asia", "location": "Mumbai", "lat": 19.0760, "lon": 72.8777, "driver": "Kenji Watanabe"},
    "V016": {"region": "Middle East", "location": "Dubai", "lat": 25.2048, "lon": 55.2708, "driver": "Nadia Petrova"},
    "V017": {"region": "Middle East", "location": "Riyadh", "lat": 24.7136, "lon": 46.6753, "driver": "Omar Khalil"},
    "V018": {"region": "Middle East", "location": "Abu Dhabi", "lat": 24.4539, "lon": 54.3773, "driver": "Lisa Bergman"},
    "V019": {"region": "Middle East", "location": "Doha", "lat": 25.2854, "lon": 51.5310, "driver": "Tomás García"},
    "V020": {"region": "Middle East", "location": "Muscat", "lat": 23.5859, "lon": 58.4059, "driver": "Aisha Mohammed"},
}

VEHICLE_IDS = [f"V{i:03d}" for i in range(1, 21)]

current_states = {}

def get_current_vehicle_state(vehicle_id):
    """Retrieve or initialize the vehicle lat/lon and battery level with random walking."""
    if vehicle_id not in current_states:
        base = VEHICLE_BASES.get(vehicle_id, {"region": "North America", "location": "New York", "lat": 40.7128, "lon": -74.0060})
        current_states[vehicle_id] = {
            "lat": base["lat"],
            "lon": base["lon"],
            "battery": random.randint(85, 100)
        }
    
    state = current_states[vehicle_id]
    
    # Dynamic random crawling
    state["lat"] += random.uniform(-0.015, 0.015)
    state["lon"] += random.uniform(-0.015, 0.015)
    
    # Battery simulation logic
    state["battery"] += random.randint(-2, 1)
    if state["battery"] > 100:
        state["battery"] = 100
    elif state["battery"] < 10:
        state["battery"] = random.randint(90, 100)
        
    return state

def generate_vehicle_telemetry(vehicle_id):
    """Simulate telemetry data for a vehicle and save it to the DB."""
    try:
        # Generate random values according to spec
        speed = random.randint(0, 120)
        fuel = random.randint(5, 100)
        temperature = random.randint(60, 120)
        
        # Determine status based on Alert Rules
        is_low_fuel = fuel < 20
        is_overheating = temperature > 100
        
        if is_low_fuel and is_overheating:
            status = "Critical"
        elif is_low_fuel:
            status = "Low Fuel"
        elif is_overheating:
            status = "Overheating"
        else:
            status = "Normal"
            
        # Get coordinates and battery status
        state = get_current_vehicle_state(vehicle_id)
        base_info = VEHICLE_BASES.get(vehicle_id, {
            "region": "North America",
            "location": "New York",
            "driver": "Unassigned"
        })
        health = max(0, min(100, 100 - (20 if status == "Critical" else 10 if status in ("Low Fuel", "Overheating") else 0)))
        
        # Log to logs/app.log
        # 1. Info log for the update event
        logging.info(f"Vehicle {vehicle_id} telemetry updated")
        
        # 2. Warning logs for alerts
        if status == "Critical":
            logging.warning(f"Vehicle {vehicle_id} critical status (low fuel & overheating)")
        elif status == "Low Fuel":
            logging.warning(f"Vehicle {vehicle_id} low fuel")
        elif status == "Overheating":
            logging.warning(f"Vehicle {vehicle_id} overheating")
            
        # Save to SQLite Database
        insert_telemetry(
            vehicle_id,
            speed,
            fuel,
            temperature,
            status,
            state["battery"],
            state["lat"],
            state["lon"],
            base_info["region"],
            base_info["location"],
            base_info.get("driver", "Unassigned"),
            health
        )
        
        # Update Prometheus metrics
        TELEMETRY_RECORDS_TOTAL.inc()
        
    except Exception as e:
        logging.error(f"Error generating telemetry for vehicle {vehicle_id}: {e}")
        raise

def run_simulation_cycle():
    """Run one simulation cycle for all 20 vehicles."""
    ACTIVE_VEHICLES.set(len(VEHICLE_IDS))
    for vehicle_id in VEHICLE_IDS:
        generate_vehicle_telemetry(vehicle_id)

def seed_initial_telemetry():
    """Ensure the database has at least one record per vehicle on startup."""
    init_db()
    existing = get_latest_telemetry()
    if len(existing) >= len(VEHICLE_IDS):
        logging.info("Telemetry data already present; skipping seed.")
        return

    run_simulation_cycle()
    logging.info("Seeded initial telemetry for 20 vehicles.")

def start_simulation_loop():
    """Infinite loop for the simulation thread."""
    logging.info("Telemetry simulation loop started.")
    while True:
        try:
            run_simulation_cycle()
        except Exception as e:
            logging.error(f"Error in telemetry simulation cycle: {e}")
        time.sleep(SIMULATION_INTERVAL)

if __name__ == '__main__':
    # Allow running the generator as a standalone script
    print("Starting standalone Telemetry Generator...")
    start_simulation_loop()
