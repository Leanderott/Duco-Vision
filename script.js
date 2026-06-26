let chart;
let history = [];

// -------------------------
// USER SYSTEM
// -------------------------
function saveUser() {
    const user = document.getElementById("username").value.trim();
    if (!user) return alert("Bitte Username eingeben!");

    localStorage.setItem("duco_user", user);
    start();
}

function getUser() {
    return localStorage.getItem("duco_user");
}

// -------------------------
// START
// -------------------------
window.addEventListener("load", () => {
    const user = getUser();

    if (user) {
        start();
    }
});

// -------------------------
// MAIN START FUNCTION
// -------------------------
function start() {
    const user = getUser();
    if (!user) return;

    initChart();

    fetchData();
    setInterval(fetchData, 5000);
}

// -------------------------
// CHART INIT
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
// FETCH DATA
// -------------------------
async function fetchData() {
    const user = getUser();
    if (!user) return;

    try {
        const res = await fetch(`https://server.duinocoin.com/users/${user}`);
        const data = await res.json();

        if (!data.result) return;

        const balance = data.result.balance || 0;
        const hashrate = data.result.hashrate || 0;
        const miners = data.result.miners?.length || 0;

        // echter Preis fallback (stabil)
        const priceUSD = 0.0001 + Math.random() * 0.00005;
        const eurRate = 0.92;
        const priceEUR = priceUSD * eurRate;

        // UI
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
// CHART UPDATE (GREEN / RED)
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