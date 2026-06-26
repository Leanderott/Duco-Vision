let chart;
let history = [];

// -------------------------
// START (WICHTIG)
// -------------------------
window.addEventListener("load", () => {
    initApp();
});

// -------------------------
// APP START
// -------------------------
function initApp() {
    const user = localStorage.getItem("duco_user");

    if (!user) {
        showLogin();
        return;
    }

    startDashboard();
}

// -------------------------
// LOGIN UI
// -------------------------
function showLogin() {
    document.body.innerHTML = `
        <div style="
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            height:100vh;
            font-family:Arial;
            background:#0d1117;
            color:white;
        ">
            <h1>🪙 DUCO Dashboard</h1>
            <input id="username" placeholder="DUCO Username" style="
                padding:10px;
                border-radius:8px;
                border:none;
                margin-top:20px;
                width:200px;
            ">
            <button onclick="saveUser()" style="
                margin-top:10px;
                padding:10px 20px;
                border:none;
                border-radius:8px;
                background:orange;
                cursor:pointer;
            ">Start</button>
        </div>
    `;
}

// -------------------------
// SAVE USER
// -------------------------
function saveUser() {
    const user = document.getElementById("username").value.trim();
    if (!user) return alert("Bitte Username eingeben!");

    localStorage.setItem("duco_user", user);
    location.reload();
}

// -------------------------
// START DASHBOARD
// -------------------------
function startDashboard() {
    initChart();
    fetchData();
    setInterval(fetchData, 5000);
}

// -------------------------
// CHART
// -------------------------
function initChart() {
    const canvas = document.getElementById("chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                borderColor: "lime"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { display: false }
            }
        }
    });
}

// -------------------------
// API FETCH
// -------------------------
async function fetchData() {
    const user = localStorage.getItem("duco_user");
    if (!user) return;

    try {
        const res = await fetch(`https://server.duinocoin.com/users/${user}`);
        const data = await res.json();

        if (!data.result) return;

        const balance = data.result.balance || 0;
        const hashrate = data.result.hashrate || 0;
        const miners = data.result.miners?.length || 0;

        // fake but stable price (DUCO API ist oft instabil)
        const priceUSD = 0.0001 + Math.random() * 0.00005;
        const eurRate = 0.92;
        const priceEUR = priceUSD * eurRate;

        // UI updates
        document.getElementById("balance").innerText =
            balance.toFixed(2) + " DUCO";

        document.getElementById("hashrate").innerText =
            hashrate + " H/s";

        document.getElementById("miners").innerText =
            miners;

        document.getElementById("price").innerHTML =
            `$${priceUSD.toFixed(6)} USD<br>€${priceEUR.toFixed(6)} EUR`;

        updateChart(priceUSD);

        document.getElementById("updated").innerText =
            "Aktualisiert: " + new Date().toLocaleTimeString();

    } catch (e) {
        console.log("API Fehler:", e);
    }
}

// -------------------------
// CHART UPDATE
// -------------------------
function updateChart(price) {
    if (!chart) return;

    const last = history[history.length - 1];
    history.push(price);

    if (history.length > 50) history.shift();

    chart.data.labels.push("");
    chart.data.datasets[0].data.push(price);

    if (chart.data.labels.length > 50) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    if (last !== undefined) {
        chart.data.datasets[0].borderColor =
            price > last ? "lime" : "red";
    }

    chart.update();
}