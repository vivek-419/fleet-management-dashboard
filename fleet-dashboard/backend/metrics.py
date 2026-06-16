from prometheus_client import Counter, Gauge

# Total API requests counter
API_REQUESTS_TOTAL = Counter(
    'api_requests_total',
    'Total number of API requests received by the backend',
    ['method', 'endpoint', 'status']
)

# Total telemetry records generated counter
TELEMETRY_RECORDS_TOTAL = Counter(
    'telemetry_records_total',
    'Total number of simulated telemetry records generated'
)

# Active vehicles gauge
ACTIVE_VEHICLES = Gauge(
    'active_vehicles',
    'Number of active vehicles in the simulated fleet'
)
