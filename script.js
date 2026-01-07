document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const blueRateInput = document.getElementById('blue-rate');
    const bluePoolInput = document.getElementById('blue-pool');
    const redPoolInput = document.getElementById('red-pool');
    const myPointsInput = document.getElementById('my-points');
    const redRateDisplay = document.getElementById('red-rate-display');

    // Outputs
    const decisionCard = document.getElementById('decision-card');
    const decisionText = document.getElementById('decision-text');
    const decisionSub = document.getElementById('decision-sub');
    const evValue = document.getElementById('ev-value');
    const oddsValue = document.getElementById('odds-value');
    const betAmount = document.getElementById('bet-amount');
    const kellyFraction = document.getElementById('kelly-fraction');

    // Add event listeners
    const inputs = [blueRateInput, bluePoolInput, redPoolInput, myPointsInput];
    inputs.forEach(input => input.addEventListener('input', calculate));

    function formatNumber(num) {
        return new Intl.NumberFormat('zh-TW').format(Math.floor(num));
    }

    function calculate() {
        const blueWinRate = parseFloat(blueRateInput.value);
        const bluePool = parseFloat(bluePoolInput.value);
        const redPool = parseFloat(redPoolInput.value);
        const myPoints = parseFloat(myPointsInput.value) || 0; // standard 0 if empty

        // Validate basic inputs to avoid NaNs
        if (isNaN(blueWinRate) || isNaN(bluePool) || isNaN(redPool) || bluePool <= 0 || redPool <= 0) {
            resetResult();
            if (!isNaN(blueWinRate)) {
                redRateDisplay.textContent = (100 - blueWinRate).toFixed(1);
            }
            return;
        }

        const redWinRate = 100 - blueWinRate;
        redRateDisplay.textContent = redWinRate.toFixed(1);

        const totalPool = bluePool + redPool;

        // Calculate Odds (Decimal Odds)
        // Twitch odds are simply Total Pool / Side Pool
        const blueOdds = totalPool / bluePool;
        const redOdds = totalPool / redPool;

        // Probabilities (0.0 - 1.0)
        const pBlue = blueWinRate / 100;
        const pRed = redWinRate / 100;

        // Calculate EV
        // EV = (Probability * Odds) - 1
        // Example: 50% chance, 3.0 odds. EV = (0.5 * 3.0) - 1 = 0.5 (+50%)
        const evBlue = (pBlue * blueOdds) - 1;
        const evRed = (pRed * redOdds) - 1;

        // Determine best bet
        let targetSide = ''; // 'blue' or 'red'
        let targetEV = 0;
        let targetOdds = 0;
        let targetP = 0;

        // Decision Logic: Look for EV > 0.10 (10%)
        // We compare user's "10% threshold" request.
        // If both are positive, pick the higher EV.
        if (evBlue > evRed) {
            targetSide = 'blue';
            targetEV = evBlue;
            targetOdds = blueOdds;
            targetP = pBlue;
        } else {
            targetSide = 'red';
            targetEV = evRed;
            targetOdds = redOdds;
            targetP = pRed;
        }

        const evThreshold = 0.10; // 10%
        let decision = 'wait'; // wait, blue, red

        if(targetEV >= evThreshold) {
            decision = targetSide;
        }

        // Update UI based on decision
        decisionCard.className = 'decision-card'; // reset classes
        evValue.textContent = (targetEV * 100).toFixed(1) + '%';
        oddsValue.textContent = targetOdds.toFixed(2) + 'x';
        
        let kellyF = 0;

        if (decision === 'blue') {
            decisionCard.classList.add('bet-blue');
            decisionText.textContent = '下注 🟦 藍方';
            decisionSub.textContent = `期望值高達 ${(targetEV * 100).toFixed(1)}%`;
            
            // Kelly Calculation
            // f* = (bp - q) / b
            // b = net odds = odds - 1
            // p = win prob
            // q = lose prob = 1 - p
            const b = targetOdds - 1;
            const q = 1 - targetP;
            kellyF = (b * targetP - q) / b;

        } else if (decision === 'red') {
            decisionCard.classList.add('bet-red');
            decisionText.textContent = '下注 🟥 紅方';
            decisionSub.textContent = `期望值高達 ${(targetEV * 100).toFixed(1)}%`;

            const b = targetOdds - 1;
            const q = 1 - targetP;
            kellyF = (b * targetP - q) / b;

        } else {
            decisionCard.classList.add('skip');
            decisionText.textContent = '👀 觀望 (Skip)';
            // If checking why:
            const maxEV = Math.max(evBlue, evRed);
            if (maxEV > 0) {
                 decisionSub.textContent = `最高獲利僅 ${(maxEV * 100).toFixed(1)}% (低於 10%)`;
            } else {
                 decisionSub.textContent = '無有利可圖的下注';
            }
            evValue.textContent = (maxEV * 100).toFixed(1) + '%';
            oddsValue.textContent = '--';
            betAmount.textContent = '0';
            kellyFraction.textContent = '0%';
            return;
        }

        // Display Kelly Info
        // Safety: ensure kellyF is between 0 and 1
        kellyF = Math.max(0, Math.min(kellyF, 1));
        
        let suggestedBet = 0;
        if(myPoints > 0) {
            suggestedBet = Math.floor(myPoints * kellyF);
        }

        kellyFraction.textContent = (kellyF * 100).toFixed(1) + '%';
        
        if (myPoints > 0) {
            betAmount.textContent = formatNumber(suggestedBet);
        } else {
            betAmount.textContent = (kellyF * 100).toFixed(1) + '% 資金';
        }
    }

    function resetResult() {
        decisionCard.className = 'decision-card';
        decisionText.textContent = '請輸入數據';
        decisionSub.textContent = '等待輸入...';
        evValue.textContent = '--';
        oddsValue.textContent = '--';
        betAmount.textContent = '--';
        kellyFraction.textContent = '--';
        redRateDisplay.textContent = '--';
    }
});
