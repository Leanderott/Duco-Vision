// --- API-ABFRAGE ÜBER DEN KORREKTEN STATISTIK-SPIEGEL (CASE-INSENSITIVE) ---
function fetchCombinedData() {
    $.ajax({
        // Jetzt mit dem echten Repository-Pfad, der die api.json enthält
        url: 'https://raw.githubusercontent.com/revoxhere/duco-statistics/master/api.json',
        method: 'GET',
        dataType: 'json',
        success: function(apiData) {
            // 1. Marktpreis für den Chart aktualisieren
            currentPriceUsd = apiData["Duco price"] || 0.00005;
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (priceChart.data.labels.length > 15) {
                priceChart.data.labels.shift();
                priceChart.data.datasets[0].data.shift();
            }
            priceChart.data.labels.push(currentTime);
            priceChart.data.datasets[0].data.push(currentPriceUsd);

            if (lastPrice !== 0) {
                if (currentPriceUsd > lastPrice) updateChartColor('up', currentPriceUsd);
                else if (currentPriceUsd < lastPrice) updateChartColor('down', currentPriceUsd);
            } else {
                updateChartColor('neutral', currentPriceUsd);
            }
            lastPrice = currentPriceUsd;

            // 2. Case-Insensitive Filter für die Balance
            let userBalance = 0;
            const searchName = username.toLowerCase();

            if (apiData["Balances"]) {
                for (const [key, value] of Object.entries(apiData["Balances"])) {
                    if (key.toLowerCase() === searchName) {
                        userBalance = parseFloat(value);
                        break;
                    }
                }
            } else if (apiData["Users orders"]) {
                for (const [key, value] of Object.entries(apiData["Users orders"])) {
                    if (key.toLowerCase() === searchName) {
                        userBalance = parseFloat(value.balance || 0);
                        break;
                    }
                }
            }

            document.getElementById('account-balance').innerHTML = `${userBalance.toFixed(2)} <span class="currency">DUCO</span>`;
            handleMilestones(userBalance);

            // 3. Case-Insensitive Filter für die Miner
            let totalHashrate = 0;
            let hardwareCounts = {};
            let currentMinerCount = 0;
            calculatedDailyDuco = 0;

            if (apiData["Miners"]) {
                let userMinersFound = null;
                for (const [key, value] of Object.entries(apiData["Miners"])) {
                    if (key.toLowerCase() === searchName) {
                        userMinersFound = value;
                        break;
                    }
                }

                if (userMinersFound) {
                    const minerList = Array.isArray(userMinersFound) ? userMinersFound : Object.values(userMinersFound);
                    minerList.forEach(miner => {
                        currentMinerCount++;
                        if (miner.hashrate) {
                            totalHashrate += parseFloat(miner.hashrate);
                            calculatedDailyDuco += (parseFloat(miner.hashrate) * 0.0072);
                        }
                        let software = miner.software || "Unknown Device";
                        hardwareCounts[software] = (hardwareCounts[software] || 0) + 1;
                    });
                } else {
                    const allMiners = Array.isArray(apiData["Miners"]) ? apiData["Miners"] : Object.values(apiData["Miners"]);
                    allMiners.forEach(miner => {
                        if (miner.user && miner.user.toLowerCase() === searchName) {
                            currentMinerCount++;
                            if (miner.hashrate) {
                                totalHashrate += parseFloat(miner.hashrate);
                                calculatedDailyDuco += (parseFloat(miner.hashrate) * 0.0072);
                            }
                            let software = miner.software || "Unknown Device";
                            hardwareCounts[software] = (hardwareCounts[software] || 0) + 1;
                        }
                    });
                }
            }

            // Boxen befüllen
            document.getElementById('miner-count').textContent = currentMinerCount;
            
            if (lastMinerCount !== -1 && currentMinerCount < lastMinerCount) {
                playSound('alarm');
            }
            lastMinerCount = currentMinerCount;

            const hashrateKhas = totalHashrate / 1000;
            document.getElementById('total-hashrate').innerHTML = `${hashrateKhas.toFixed(2)} <span class="currency">KH/s</span>`;
            document.getElementById('estimated-earnings').innerHTML = `${calculatedDailyDuco.toFixed(2)} <span class="currency">DUCO</span>`;

            // Hardware-Breakdown rendern
            const breakdownContainer = document.getElementById('hardware-breakdown');
            breakdownContainer.innerHTML = "";
            
            if (currentMinerCount === 0) {
                breakdownContainer.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">Waiting for miners...</p>`;
            } else {
                for (const [hwName, count] of Object.entries(hardwareCounts)) {
                    breakdownContainer.innerHTML += `
                        <div class="hardware-item">
                            <span>⚙️ ${hwName}:</span>
                            <strong>${count}</strong>
                        </div>
                    `;
                }
            }

            const dailyUsdValue = calculatedDailyDuco * currentPriceUsd;
            document.getElementById('usd-earnings').innerHTML = `$${dailyUsdValue.toFixed(12)} <span class="currency">USD</span>`;
            
            priceChart.update();
        },
        error: function(err) {
            console.error("Critical API Stream sync failed:", err);
        }
    });
}
