document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    initMockFleet();
    renderMapMarkers();
    renderFleetTable();
    renderAlerts();
    updateKPIs();

    fetchTelemetry();

    setInterval(updateHeaderClock, 1000);
    updateHeaderClock();

    setInterval(simulateRealtimeTick, 3000);
    setInterval(pushNewAlert, 8000);
    setInterval(fetchTelemetry, 5000);
    setInterval(updateSparkline, 2000);

    document.getElementById("table-search").addEventListener("input", renderFleetTable);
    document.getElementById("filter-status").addEventListener("change", renderFleetTable);
    document.getElementById("map-region-select").addEventListener("change", (e) => {
        document.getElementById("map-region-label").textContent = e.target.value;
        renderMapMarkers();
    });
});

// ── STATE ──
let fleetData = [];
let mapMarkers = [];
let activeAlerts = [];
let chartThroughput, chartStatusRegion;

const DRIVERS = [
    "James Chen", "Maria Santos", "David Okonkwo", "Elena Volkov",
    "Raj Patel", "Sarah Mitchell", "Ahmed Hassan", "Yuki Tanaka",
    "Carlos Rivera", "Fatima Al-Rashid", "Liam O'Brien", "Priya Sharma",
    "Marcus Johnson", "Sofia Andersson", "Kenji Watanabe", "Nadia Petrova",
    "Omar Khalil", "Lisa Bergman", "Tomás García", "Aisha Mohammed"
];

const ALERT_MESSAGES = [
    "Engine temperature exceeding threshold",
    "Fuel level critically low",
    "GPS signal intermittent",
    "Brake system pressure anomaly",
    "Tire pressure below minimum",
    "Battery voltage dropping",
    "Route deviation detected",
    "Idle time exceeded limit",
    "Collision sensor triggered",
    "Coolant level low",
    "Transmission temperature high",
    "Door sensor malfunction"
];

const LOCATIONS = {
    "North America": ["Chicago, IL", "Dallas, TX", "Toronto, ON", "Denver, CO", "Atlanta, GA"],
    "Europe": ["London, UK", "Berlin, DE", "Paris, FR", "Madrid, ES", "Warsaw, PL"],
    "Asia": ["Tokyo, JP", "Seoul, KR", "Mumbai, IN", "Singapore", "Bangkok, TH"],
    "Middle East": ["Dubai, AE", "Riyadh, SA", "Doha, QA", "Abu Dhabi, AE", "Muscat, OM"]
};

const REGIONS = ["North America", "Europe", "Asia", "Middle East"];

// ── STATUS MAPPING (backend → dashboard) ──
function mapStatus(backendStatus) {
    if (backendStatus === "Normal") return "Online";
    if (backendStatus === "Critical") return "Offline";
    return "Warning";
}

function mapStatusToMarker(uiStatus) {
    if (uiStatus === "Online") return "online";
    if (uiStatus === "Warning") return "warning";
    return "critical";
}

function formatVehicleId(id) {
    if (id.startsWith("VH-")) return id;
    const num = id.replace(/\D/g, "");
    return `VH-${num.padStart(5, "0")}`;
}

// ── MOCK FLEET ──
function initMockFleet() {
    fleetData = [];
    for (let i = 1; i <= 20; i++) {
        const region = REGIONS[(i - 1) % 4];
        const roll = Math.random();
        let status = "Online";
        if (roll < 0.1) status = "Offline";
        else if (roll < 0.3) status = "Warning";

        fleetData.push({
            vehicle_id: `VH-${String(90000 + i).slice(1)}`,
            raw_id: `V${String(i).padStart(3, "0")}`,
            status,
            region,
            speed: Math.floor(Math.random() * 110) + 5,
            fuel: Math.floor(Math.random() * 90) + 10,
            location: LOCATIONS[region][Math.floor(Math.random() * LOCATIONS[region].length)],
            driver: DRIVERS[i - 1],
            lastUpdate: new Date(),
            mapX: 10 + Math.random() * 80,
            mapY: 10 + Math.random() * 75
        });
    }
}

// ── API INTEGRATION ──
async function fetchTelemetry() {
    try {
        const res = await fetch("/api/telemetry");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        document.getElementById("error-overlay").style.display = "none";

        data.forEach((v, idx) => {
            const existing = fleetData.find(f => f.raw_id === v.vehicle_id);
            const region = v.region || REGIONS[idx % 4];
            const uiStatus = mapStatus(v.status);

            if (existing) {
                existing.status = uiStatus;
                existing.speed = v.speed;
                existing.fuel = v.fuel;
                existing.region = region;
                existing.location = v.location || existing.location;
                existing.lastUpdate = new Date(v.timestamp ? v.timestamp.replace(" ", "T") + "Z" : Date.now());
            } else {
                fleetData.push({
                    vehicle_id: formatVehicleId(v.vehicle_id),
                    raw_id: v.vehicle_id,
                    status: uiStatus,
                    region,
                    speed: v.speed,
                    fuel: v.fuel,
                    location: v.location || LOCATIONS[region][0],
                    driver: DRIVERS[idx % DRIVERS.length],
                    lastUpdate: new Date(),
                    mapX: 10 + Math.random() * 80,
                    mapY: 10 + Math.random() * 75
                });
            }
        });

        renderMapMarkers();
        renderFleetTable();
        updateCharts();
    } catch (err) {
        console.warn("API unavailable, using simulated data:", err.message);
    }
}

// ── CLOCK ──
function updateHeaderClock() {
    document.getElementById("header-clock").textContent = new Date().toLocaleTimeString();
}

// ── KPIs ──
function updateKPIs() {
    const online = fleetData.filter(v => v.status === "Online").length;
    const baseActive = 142000 + online * 180;
    const fluctuation = Math.floor(Math.random() * 800) - 400;
    document.getElementById("kpi-active-vehicles").textContent = (baseActive + fluctuation).toLocaleString();

    const eventsM = (8.2 + Math.random() * 0.5).toFixed(1);
    document.getElementById("kpi-events-min").textContent = `${eventsM}M`;

    const warnings = fleetData.filter(v => v.status === "Warning").length + 10;
    const criticals = fleetData.filter(v => v.status === "Offline").length + 8;
    const totalAlerts = warnings + criticals;
    document.getElementById("kpi-active-alerts").textContent = totalAlerts;
    document.getElementById("kpi-alert-breakdown").textContent = `${warnings} Warning • ${criticals} Critical`;

    const uptime = (99.95 + Math.random() * 0.04).toFixed(2);
    document.getElementById("kpi-uptime").textContent = `${uptime}%`;
    const offset = 100 - parseFloat(uptime);
    document.getElementById("uptime-ring-fill").style.strokeDashoffset = offset;
}

function updateSparkline() {
    const path = document.getElementById("sparkline-path");
    if (!path) return;
    const points = [];
    for (let i = 0; i <= 8; i++) {
        const x = i * 10;
        const y = 6 + Math.random() * 14;
        points.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
    }
    path.setAttribute("d", points.join(" "));
}

// ── REALTIME SIMULATION ──
function simulateRealtimeTick() {
    fleetData.forEach(v => {
        v.speed = Math.max(0, Math.min(120, v.speed + Math.floor(Math.random() * 11) - 5));
        v.fuel = Math.max(5, Math.min(100, v.fuel + Math.floor(Math.random() * 5) - 2));
        v.lastUpdate = new Date();

        if (Math.random() < 0.05) {
            const statuses = ["Online", "Warning", "Offline"];
            const weights = [0.7, 0.2, 0.1];
            const r = Math.random();
            let cum = 0;
            for (let i = 0; i < statuses.length; i++) {
                cum += weights[i];
                if (r < cum) { v.status = statuses[i]; break; }
            }
        }
    });

    updateKPIs();
    renderMapMarkers();
    renderFleetTable();
    updateCharts();
}

// ── MAP ──
function renderMapMarkers() {
    const container = document.getElementById("map-markers");
    const regionFilter = document.getElementById("map-region-select").value;
    container.innerHTML = "";

    const filtered = regionFilter === "Global"
        ? fleetData
        : fleetData.filter(v => v.region === regionFilter);

    filtered.forEach(v => {
        const dot = document.createElement("div");
        dot.className = `map-marker ${mapStatusToMarker(v.status)}`;
        dot.style.left = `${v.mapX}%`;
        dot.style.top = `${v.mapY}%`;
        dot.dataset.id = v.vehicle_id;

        dot.addEventListener("mouseenter", (e) => showMapTooltip(e, v));
        dot.addEventListener("mousemove", (e) => moveTooltip(e, "map-tooltip"));
        dot.addEventListener("mouseleave", () => hideTooltip("map-tooltip"));

        container.appendChild(dot);
    });
}

function showMapTooltip(e, v) {
    const tip = document.getElementById("map-tooltip");
    tip.innerHTML = `
        <div class="tt-id">${v.vehicle_id}</div>
        <div class="tt-row"><span>Status</span><span>${v.status}</span></div>
        <div class="tt-row"><span>Speed</span><span>${v.speed} km/h</span></div>
        <div class="tt-row"><span>Fuel</span><span>${v.fuel}%</span></div>
        <div class="tt-row"><span>Driver</span><span>${v.driver}</span></div>
    `;
    tip.classList.add("visible");
    moveTooltip(e, "map-tooltip");
}

function moveTooltip(e, id) {
    const tip = document.getElementById(id);
    tip.style.left = `${e.clientX + 14}px`;
    tip.style.top = `${e.clientY - 10}px`;
}

function hideTooltip(id) {
    document.getElementById(id).classList.remove("visible");
}

// ── ALERTS ──
function pushNewAlert() {
    const vehicle = fleetData[Math.floor(Math.random() * fleetData.length)];
    const severities = ["critical", "warning", "warning", "info"];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const message = ALERT_MESSAGES[Math.floor(Math.random() * ALERT_MESSAGES.length)];

    const alert = {
        id: `alert-${Date.now()}`,
        vehicle_id: vehicle.vehicle_id,
        message,
        location: vehicle.location,
        severity,
        timestamp: new Date(),
        isNew: true
    };

    activeAlerts.unshift(alert);
    if (activeAlerts.length > 30) activeAlerts.pop();
    renderAlerts();
}

function seedInitialAlerts() {
    for (let i = 0; i < 6; i++) pushNewAlert();
}

function timeAgo(date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)}h ago`;
}

function renderAlerts() {
    const feed = document.getElementById("live-alert-feed");
    const count = activeAlerts.filter(a => a.severity !== "info").length;
    document.getElementById("alert-feed-count").textContent = count;

    if (activeAlerts.length === 0) {
        feed.innerHTML = `<div class="text-muted" style="text-align:center;padding:40px 0;font-size:0.8rem;">Listening for fleet alerts...</div>`;
        return;
    }

    feed.innerHTML = "";
    activeAlerts.forEach(alert => {
        const card = document.createElement("div");
        card.className = `alert-card ${alert.severity}${alert.isNew ? " new-alert" : ""}`;
        card.innerHTML = `
            <div class="alert-severity-bar"></div>
            <div class="alert-content">
                <div class="alert-vehicle-id">${alert.vehicle_id}</div>
                <p class="alert-message">${alert.message}</p>
                <div class="alert-meta">
                    <span>${alert.location}</span>
                    <span>${timeAgo(alert.timestamp)}</span>
                </div>
            </div>
        `;
        feed.appendChild(card);
        alert.isNew = false;
    });
}

// Seed alerts after a short delay
setTimeout(seedInitialAlerts, 500);

// ── CHARTS ──
function initCharts() {
    Chart.defaults.color = "#94A3B8";
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = "#1A2030";
    Chart.defaults.plugins.tooltip.borderColor = "#2A3245";
    Chart.defaults.plugins.tooltip.borderWidth = 1;

    const hours = [];
    const throughput = [];
    for (let i = 23; i >= 0; i--) {
        hours.push(`${i}h`);
        throughput.push(7.5 + Math.random() * 2);
    }

    const ctxT = document.getElementById("chart-throughput").getContext("2d");
    const gradient = ctxT.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, "rgba(34, 211, 238, 0.25)");
    gradient.addColorStop(1, "rgba(34, 211, 238, 0)");

    chartThroughput = new Chart(ctxT, {
        type: "line",
        data: {
            labels: hours.reverse(),
            datasets: [{
                data: throughput,
                borderColor: "#22D3EE",
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: "rgba(42,50,69,0.4)" }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
                y: { grid: { color: "rgba(42,50,69,0.4)" }, ticks: { callback: v => v + "M", font: { size: 10 } } }
            }
        }
    });

    chartStatusRegion = new Chart(document.getElementById("chart-status-region"), {
        type: "bar",
        data: {
            labels: REGIONS,
            datasets: [
                { label: "Online", data: [0, 0, 0, 0], backgroundColor: "#10B981", borderRadius: 3 },
                { label: "Warning", data: [0, 0, 0, 0], backgroundColor: "#F59E0B", borderRadius: 3 },
                { label: "Offline", data: [0, 0, 0, 0], backgroundColor: "#EF4444", borderRadius: 3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom", labels: { boxWidth: 10, padding: 12, font: { size: 10 } } }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { stacked: true, grid: { color: "rgba(42,50,69,0.4)" }, ticks: { font: { size: 10 } } }
            }
        }
    });
}

function updateCharts() {
    if (!chartStatusRegion) return;

    const regionCounts = {};
    REGIONS.forEach(r => {
        regionCounts[r] = { Online: 0, Warning: 0, Offline: 0 };
    });
    fleetData.forEach(v => {
        if (regionCounts[v.region]) regionCounts[v.region][v.status]++;
    });

    const scale = 3000;
    chartStatusRegion.data.datasets[0].data = REGIONS.map(r => regionCounts[r].Online * scale + Math.floor(Math.random() * 500));
    chartStatusRegion.data.datasets[1].data = REGIONS.map(r => regionCounts[r].Warning * scale + Math.floor(Math.random() * 200));
    chartStatusRegion.data.datasets[2].data = REGIONS.map(r => regionCounts[r].Offline * scale + Math.floor(Math.random() * 100));
    chartStatusRegion.update("none");

    if (chartThroughput) {
        const data = chartThroughput.data.datasets[0].data;
        data.shift();
        data.push(7.5 + Math.random() * 2.5);
        chartThroughput.data.labels.shift();
        chartThroughput.data.labels.push("now");
        chartThroughput.update("none");
    }
}

// ── FLEET TABLE ──
function renderFleetTable() {
    const tbody = document.getElementById("fleet-tbody");
    const search = document.getElementById("table-search").value.toLowerCase();
    const statusFilter = document.getElementById("filter-status").value;

    let filtered = [...fleetData];
    if (statusFilter !== "ALL") filtered = filtered.filter(v => v.status === statusFilter);
    if (search) {
        filtered = filtered.filter(v =>
            v.vehicle_id.toLowerCase().includes(search) ||
            v.driver.toLowerCase().includes(search)
        );
    }

    tbody.innerHTML = "";
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#94A3B8;">No vehicles match your filters.</td></tr>`;
        return;
    }

    filtered.forEach(v => {
        const row = document.createElement("tr");
        const statusClass = v.status.toLowerCase();
        const fuelClass = v.fuel > 50 ? "high" : v.fuel > 25 ? "mid" : "low";

        row.innerHTML = `
            <td class="vehicle-id">${v.vehicle_id}</td>
            <td><span class="status-pill ${statusClass}">${v.status}</span></td>
            <td>${v.region}</td>
            <td class="mono">${v.speed}</td>
            <td>
                <div class="fuel-cell">
                    <div class="fuel-bar"><div class="fuel-fill ${fuelClass}" style="width:${v.fuel}%"></div></div>
                    <span class="fuel-pct">${v.fuel}%</span>
                </div>
            </td>
            <td class="mono" style="color:#94A3B8;font-size:0.75rem;">${formatTime(v.lastUpdate)}</td>
            <td>${v.driver}</td>
        `;

        row.addEventListener("mouseenter", (e) => showRowTooltip(e, v));
        row.addEventListener("mousemove", (e) => {
            let tip = document.getElementById("row-tooltip");
            if (tip) moveTooltip(e, "row-tooltip");
        });
        row.addEventListener("mouseleave", () => {
            const tip = document.getElementById("row-tooltip");
            if (tip) tip.remove();
        });

        tbody.appendChild(row);
    });
}

function showRowTooltip(e, v) {
    let tip = document.getElementById("row-tooltip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "row-tooltip";
        tip.className = "row-tooltip";
        document.body.appendChild(tip);
    }
    tip.innerHTML = `
        <div class="tt-id">${v.vehicle_id}</div>
        <div class="tt-row"><span>Location</span><span>${v.location}</span></div>
        <div class="tt-row"><span>Speed</span><span>${v.speed} km/h</span></div>
        <div class="tt-row"><span>Fuel</span><span>${v.fuel}%</span></div>
        <div class="tt-row"><span>Status</span><span>${v.status}</span></div>
    `;
    tip.classList.add("visible");
    moveTooltip(e, "row-tooltip");
}

function formatTime(date) {
    if (!date || isNaN(date.getTime())) return "--:--:--";
    return date.toLocaleTimeString();
}
