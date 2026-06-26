let chart;
let history = [];

// ---------------- LOGIN ----------------
function login() {
    const user = document.getElementById("username").value.trim();
    if (!user) return alert("Bitte Username eingeben!");

    // kein speichern → jedes Mal neu Login wie gewünscht
    startDashboard(user);
}

// ---------------- START DASHBOARD ----------------
function startDashboard(user) {

    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    initChart();
    fetchData(user);

    setInterval(() => fetchData(user), 5000);
}

// ---------------- CHART ----------------
function initChart() {
    const ctx = document.getElementById("chart").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderWidth: 2,
                pointRadius: 0,
                borderColor: "lime"
            }]
        }
    });
}

// ---------------- DATA ----------------
async function fetchData(user) {

    try {
        const res = await fetch(`https://server.duinocoin.com/users/${user}`);
        const data = await res.json();

        if (!data.result) return;

        const b = data.result.balance || 0;
        const h = data.result.hashrate || 0;
        const m = data.result.miners?.length || 0;

        const price = 0.0001 + Math.random() * 0.00005;

        document.getElementById("balance").innerText = b;
        document.getElementById("hashrate").innerText = h;
        document.getElementById("miners").innerText = m;
        document.getElementById("price").innerText = price.toFixed(6);

        updateChart(price);

    } catch (e) {
        console.log(e);
    }
}

// ---------------- CHART UPDATE ----------------
function updateChart(p) {

    const last = history[history.length - 1];
    history.push(p);

    if (history.length > 50) history.shift();

    chart.data.labels.push("");
    chart.data.datasets[0].data.push(p);

    if (last) {
        chart.data.datasets[0].borderColor =
            p > last ? "lime" : "red";
    }

    chart.update();
}