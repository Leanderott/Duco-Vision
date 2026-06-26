let chart;
let history = [];

// ---------------- LOGIN ----------------
function saveUser() {
    const u = document.getElementById("username").value.trim();
    if (!u) return;

    localStorage.setItem("duco_user", u);
    location.reload();
}

function getUser() {
    return localStorage.getItem("duco_user");
}

// ---------------- START ----------------
window.addEventListener("load", () => {
    const user = getUser();

    if (!user) {
        document.getElementById("login").style.display = "block";
        document.getElementById("dashboard").style.display = "none";
        return;
    }

    document.getElementById("login").style.display = "none";
    document.getElementById("dashboard").style.display = "block";

    document.getElementById("donateUser").innerText = user;

    initChart();
    fetchData();
    setInterval(fetchData, 5000);
});

// ---------------- TABS ----------------
function showTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
    document.getElementById(tab).classList.remove("hidden");
}

// ---------------- CHAT ----------------
function sendChat() {
    const input = document.getElementById("chatInput");
    const msg = input.value;
    if (!msg) return;

    const div = document.createElement("div");
    div.innerText = "💬 " + msg;

    document.getElementById("chatBox").appendChild(div);
    input.value = "";
}

// ---------------- DONATE ----------------
function copyDonate() {
    const user = getUser();
    navigator.clipboard.writeText(user);
    alert("Copied: " + user);
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
async function fetchData() {
    const user = getUser();
    if (!user) return;

    const res = await fetch(`https://server.duinocoin.com/users/${user}`);
    const data = await res.json();

    if (!data.result) return;

    const balance = data.result.balance || 0;
    const hashrate = data.result.hashrate || 0;
    const miners = data.result.miners?.length || 0;

    const price = 0.0001 + Math.random() * 0.00005;
    const eur = price * 0.92;

    document.getElementById("balance").innerText = balance;
    document.getElementById("hashrate").innerText = hashrate;
    document.getElementById("miners").innerText = miners;
    document.getElementById("price").innerHTML = `$${price} USD / €${eur}`;

    updateChart(price);

    document.getElementById("updated").innerText =
        "Updated " + new Date().toLocaleTimeString();
}

// ---------------- CHART ----------------
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