// Globale Variablen für User und Chart
let username = "";
let priceChart;
let lastPrice = 0;

// DOM Elemente
const loginOverlay = document.getElementById('login-overlay');
const dashboard = document.getElementById('dashboard');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const userDisplay = document.getElementById('user-display');

// Login Event Listener
loginBtn.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username !== "") {
        userDisplay.textContent = `- ${username}`;
        loginOverlay.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        // Initialisiere Dashboard-Daten
        initChart();
        fetchDucoData();
        // Daten alle 15 Sekunden neu laden
        setInterval(fetchDucoData, 15000);
    } else {
        alert("Bitte gib einen gültigen Namen ein!");
    }
});

// Chart.js Initialisierung
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Zeitstempel kommen hier rein
            datasets: [{
                label: 'DUCO Preis (USD)',
                data: [],
                borderColor: '#ffffff', // Standardfarbe weiß
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: '#222' }, ticks: { color: '#aaa' } },
                y: { grid: { color: '#222' }, ticks: { color: '#aaa' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Daten von der Duino-Coin API abrufen
async function fetchDucoData() {
    try {
        // 1. User Miner Daten abrufen
        const userResponse = await fetch(`https://server.duinocoin.com/users/${username}`);
        const userData = await userResponse.json();
        
        if(userData && userData.success) {
            const miners = userData.result.miners;
            const minerCount = miners ? miners.length : 0;
            document.getElementById('miner-count').textContent = minerCount;
            
            // Berechnung der voraussichtlichen 24h Einnahmen basierend auf den aktuellen Minern
            let dailyEstimation = 0;
            if (miners && miners.length > 0) {
                miners.forEach(miner => {
                    // Schätzung basierend auf der Hashrate oder Standardwerten der API falls verfügbar
                    dailyEstimation += (miner.hashrate / 100) * 0.1; // Annäherungswert
                });
            }
            document.getElementById('estimated-earnings').textContent = `${dailyEstimation.toFixed(2)} DUCO`;
        }

        // 2. Globalen API Preis abrufen für das Echtzeit-Diagramm
        const apiResponse = await fetch('https://server.duinocoin.com/api_context');
        const apiData = await apiResponse.json();
        
        // Preis aus der API extrahieren (Bsp: Duco Preis in USD)
        const currentPrice = apiData["Duco price"] || 0.00005; 
        
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Update Chart Daten
        if (priceChart.data.labels.length > 10) {
            priceChart.data.labels.shift();
            priceChart.data.datasets[0].data.shift();
        }

        priceChart.data.labels.push(currentTime);
        priceChart.data.datasets[0].data.push(currentPrice);

        // Farbänderung Logik: Wenn sinkt ROT, wenn steigt GRÜN
        if (lastPrice !== 0) {
            if (currentPrice > lastPrice) {
                priceChart.data.datasets[0].borderColor = '#00ff00'; // Grün bei Anstieg
            } else if (currentPrice < lastPrice) {
                priceChart.data.datasets[0].borderColor = '#ff0000'; // Rot bei Abfall
            }
        }
        
        lastPrice = currentPrice;
        priceChart.update();

    } catch (error) {
        console.error("Fehler beim Abrufen der API-Daten:", error);
    }
}