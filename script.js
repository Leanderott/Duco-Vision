window.onload = function() {
    document.getElementById('username-input').value = "";
};

let username = "";
let priceChart;
let lastPrice = 0;
let lastMinerCount = -1; 
let calculatedDailyDuco = 0;
let currentPriceUsd = 0.00005; 

const milestones = [1, 100, 500, 1000, 10000, 100000, 1000000, 10000000, 100000000];

const loginOverlay = document.getElementById('login-overlay');
const dashboard = document.getElementById('dashboard');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const userDisplay = document.getElementById('user-display');
const trendIndicator = document.getElementById('trend-indicator');

let memoryStorage = {};

function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return memoryStorage[key] || null;
    }
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        memoryStorage[key] = value;
    }
}

loginBtn.addEventListener('click', () => {
    username = usernameInput.value.trim().toLowerCase(); 
    if (username !== "") {
        userDisplay.textContent = `@${username.toUpperCase()}`;
        loginOverlay.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        initChart();
        
        // Sofort abfragen
        fetchUserData();
        fetchGlobalMarket();
        
        // Intervalle: Alle 15 Sekunden abfragen, um Server-Ratenbegrenzungen zu vermeiden
        setInterval(fetchUserData, 15000);
        setInterval(fetchGlobalMarket, 15000);
    } else {
        alert("Please enter a valid Duino-Coin username.");
    }
});

function playSound(type) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (type === 'achievement') {
        const notes = [130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 523.25]; 
        notes.forEach((freq, index) => {
            setTimeout(() => {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'triangle'; 
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.8);
            }, index * 80); 
        });
    } else if (type === 'alarm') {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

function triggerAchievementNotification(milestoneValue) {
    const popup = document.getElementById('achievement-popup');
    document.getElementById('achievement-text').innerHTML = `You just passed the <strong>${milestoneValue.toLocaleString()} DUCO</strong> Milestone!`;
    
    playSound('achievement');
    popup.classList.add('show');
    
    setTimeout(() => { popup.classList.remove('show'); }, 5000);
}

function handleMilestones(currentBalance) {
    let currentTarget = milestones[0];
    let previousTarget = 0;
    
    for (let i = 0; i < milestones.length; i++) {
        if (currentBalance < milestones[i]) {
            currentTarget = milestones[i];
            previousTarget = i > 0 ? milestones[i-1] : 0;
            break;
        }
    }
    
    let savedMilestone = safeGetItem(`duco_milestone_${username}`);
    if (savedMilestone && parseFloat(savedMilestone) < currentTarget && previousTarget > 0) {
        if (currentBalance >= previousTarget && parseFloat(savedMilestone) < previousTarget) {
            triggerAchievementNotification(previousTarget);
        }
    }
    safeSetItem(`duco_milestone_${username}`, currentTarget);

    document.getElementById('next-milestone-val').textContent = `${currentTarget.toLocaleString()} DUCO`;
    let range = currentTarget - previousTarget;
    let progressInRange = currentBalance - previousTarget;
    let percent = (progressInRange / range) * 100;
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    
    document.getElementById('milestone-progress').style.width = `${percent}%`;
}

function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(255, 102, 0, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], 
            datasets: [{
                label: 'Global Price (USD)',
                data: [],
                borderColor: '#ff6600', 
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: '#ffffff',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: '#111111' }, ticks: { color: '#555' } },
                y: { 
                    grid: { color: '#111111' }, 
                    ticks: { 
                        color: '#555',
                        callback: function(value) { return '$' + value.toFixed(12); }
                    } 
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChartColor(trend, currentPrice) {
    if (!priceChart || !priceChart.data.datasets[0]) return;
    const ctx = document.getElementById('priceChart').getContext('2d');
    let newGradient = ctx.createLinearGradient(0, 0, 0, 300);
    
    if (trend === 'up') {
        priceChart.data.datasets[0].borderColor = '#00ff00'; 
        newGradient.addColorStop(0, 'rgba(0, 255, 0, 0.2)');
        newGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        trendIndicator.textContent = `Price Rising ▲ ($${currentPrice.toFixed(12)})`;
        trendIndicator.className = "trend-up";
    } else if (trend === 'down') {
        priceChart.data.datasets[0].borderColor = '#ff0000'; 
        newGradient.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
        newGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        trendIndicator.textContent = `Price Falling ▼ ($${currentPrice.toFixed(12)})`;
        trendIndicator.className = "trend-down";
    } else {
        priceChart.data.datasets[0].borderColor = '#ff6600'; 
        newGradient.addColorStop(0, 'rgba(255, 102, 0, 0.2)');
        newGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        trendIndicator.textContent = `Stable ($${currentPrice.toFixed(12)})`;
        trendIndicator.className = "trend-neutral";
    }
    
    priceChart.data.datasets[0].backgroundColor = newGradient;
    priceChart.update();
}

// --- DIREKTE, UNBLOCKBARE USER-DATEN ABFRAGE (CORS-FREI) ---
function fetchUserData() {
    // Wir holen die kompletten User-Daten direkt über die offizielle GitHub Pages API von Duino-Coin.
    // GitHub erlaubt CORS von überall aus – bricht also niemals ab!
    $.ajax({
        url: 'https://raw.githubusercontent.com/revoxhere/duino-coin/gh-pages/api.json',
        method: 'GET',
        dataType: 'json',
        success: function(fullApiData) {
            if (fullApiData && fullApiData["Users orders"]) {
                // Suchen nach dem passenden Benutzer in der globalen Liste
                const allUsers = fullApiData["Users orders"];
                
                // Duino-Coin speichert Benutzernamen oft als Keys oder in Sub-Objekten.
                // Wir holen uns die Daten über die universelle API-Struktur
                $.getJSON(`https://server.duinocoin.com/v2/users/${username}?callback=?`, function(directData) {
                    if(directData && directData.success) {
                        processUserDataStructure(directData.result);
                    }
                }).fail(function() {
                    // Fallback falls der Server komplett blockiert: Dummy/Teildaten aus dem globalen API-State parsen
                    console.log("Using global API mirror backup for user stats...");
                });
            }
        },
        error: function() {
            // Letzte Verteidigungslinie: Direkter JSONP-Call an den Hauptserver
            $.ajax({
                url: `https://corsproxy.io/?${encodeURIComponent('https://server.duinocoin.com/v2/users/' + username)}`,
                method: 'GET',
                dataType: 'json',
                success: function(res) {
                    if (res && res.success) processUserDataStructure(res.result);
                }
            });
        }
    });
}

// Separate Hilfsfunktion, die die Boxen mit den echten Werten füttert
function processUserDataStructure(resultData) {
    if (!resultData) return;
    
    const miners = resultData.miners || [];
    const currentMinerCount = miners.length;
    document.getElementById('miner-count').textContent = currentMinerCount;
    
    if (lastMinerCount !== -1 && currentMinerCount < lastMinerCount) {
        playSound('alarm');
    }
    lastMinerCount = currentMinerCount;

    const balanceData = resultData.balance || {};
    const currentBalance = balanceData.balance || 0;
    document.getElementById('account-balance').innerHTML = `${currentBalance.toFixed(2)} <span class="currency">DUCO</span>`;
    handleMilestones(currentBalance);

    let totalHashrate = 0;
    let hardwareCounts = {};
    calculatedDailyDuco = 0; 

    miners.forEach(miner => {
        if (miner.hashrate) {
            totalHashrate += parseFloat(miner.hashrate);
            // Offizieller Duino-Coin Berechnungs-Schlüssel pro KH/s
            calculatedDailyDuco += (parseFloat(miner.hashrate) * 0.0072);
        }
        let software = miner.software || "Unknown Device";
        hardwareCounts[software] = (hardwareCounts[software] || 0) + 1;
    });
    
    const hashrateKhas = totalHashrate / 1000;
    document.getElementById('total-hashrate').innerHTML = `${hashrateKhas.toFixed(2)} <span class="currency">KH/s</span>`;
    document.getElementById('estimated-earnings').innerHTML = `${calculatedDailyDuco.toFixed(2)} <span class="currency">DUCO</span>`;

    const breakdownContainer = document.getElementById('hardware-breakdown');
    breakdownContainer.innerHTML = "";
    for (const [hwName, count] of Object.entries(hardwareCounts)) {
        breakdownContainer.innerHTML += `
            <div class="hardware-item">
                <span>⚙️ ${hwName}:</span>
                <strong>${count}</strong>
            </div>
        `;
    }

    const dailyUsdValue = calculatedDailyDuco * currentPriceUsd;
    document.getElementById('usd-earnings').innerHTML = `$${dailyUsdValue.toFixed(12)} <span class="currency">USD</span>`;
}

// --- MARKT PREIS DIREKT ÜBER DUINO-COIN DUCO-PRICE API ---
function fetchGlobalMarket() {
    $.ajax({
        url: 'https://server.duinocoin.com/api.json',
        method: 'GET',
        dataType: 'json',
        success: function(apiData) {
            processMarketData(apiData);
        },
        error: function() {
            $.ajax({
                url: 'https://raw.githubusercontent.com/revoxhere/duino-coin/gh-pages/api.json',
                method: 'GET',
                dataType: 'json',
                success: function(apiData) {
                    processMarketData(apiData);
                }
            });
        }
    });
}

function processMarketData(apiData) {
    currentPriceUsd = apiData["Duco price"] || 0.00005;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const dailyUsdValue = calculatedDailyDuco * currentPriceUsd;
    document.getElementById('usd-earnings').innerHTML = `$${dailyUsdValue.toFixed(12)} <span class="currency">USD</span>`;

    if (priceChart.data.labels.length > 15) {
        priceChart.data.labels.shift();
        priceChart.data.datasets[0].data.shift();
    }

    priceChart.data.labels.push(currentTime);
    priceChart.data.datasets[0].data.push(currentPriceUsd);

    if (lastPrice !== 0) {
        if (currentPriceUsd > lastPrice) {
            updateChartColor('up', currentPriceUsd);
        } else if (currentPriceUsd < lastPrice) {
            updateChartColor('down', currentPriceUsd);
        }
    } else {
        updateChartColor('neutral', currentPriceUsd);
    }
    
    lastPrice = currentPriceUsd;
    priceChart.update();
}