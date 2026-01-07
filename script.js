document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('options-container');
    const template = document.getElementById('option-template');
    const addBtn = document.getElementById('add-option-btn');
    const totalRateDisplay = document.getElementById('total-rate-display');
    const myPointsInput = document.getElementById('my-points');

    // Outputs
    const decisionCard = document.getElementById('decision-card');
    const decisionText = document.getElementById('decision-text');
    const decisionSub = document.getElementById('decision-sub');
    const evValue = document.getElementById('ev-value');
    const oddsValue = document.getElementById('odds-value');
    const betAmount = document.getElementById('bet-amount');
    const kellyFraction = document.getElementById('kelly-fraction');

    // Colors for options (cycling)
    const optionColors = [
        '#00d6d6', // Blue/Cyan
        '#eb0400', // Red
        '#00fa9a', // Green
        '#ff69b4', // Pink
        '#ffd700', // Gold
        '#1e90ff', // Blue
        '#da70d6', // Orchid
        '#ff4500'  // OrangeRed
    ];

    // State to track next Color Index
    let colorIndex = 0;

    // Initialize with 2 default options
    addOption('藍方', 0); // Blue
    addOption('紅方', 1); // Red

    // Event Listeners
    addBtn.addEventListener('click', () => {
        addOption(`選項 ${container.children.length + 1}`);
        calculate();
    });

    myPointsInput.addEventListener('input', calculate);

    function addOption(name, forceColorIdx = null) {
        const clone = template.content.cloneNode(true);
        const row = clone.querySelector('.option-row');

        // Coloring
        const idx = (forceColorIdx !== null) ? forceColorIdx : (container.children.length % optionColors.length);
        const color = optionColors[idx];
        row.querySelector('.option-color-stripe').style.backgroundColor = color;
        row.dataset.color = color; // Store for usage in decision card

        // Inputs
        const nameInput = row.querySelector('.opt-name');
        const rateInput = row.querySelector('.opt-rate');
        const poolInput = row.querySelector('.opt-pool');
        const deleteBtn = row.querySelector('.btn-delete');

        nameInput.value = name || `選項 ${container.children.length + 1}`;

        // Bind events
        [nameInput, rateInput, poolInput].forEach(inp => {
            inp.addEventListener('input', calculate);
        });

        // Delete logic
        deleteBtn.addEventListener('click', () => {
            if (container.children.length <= 2) {
                alert('至少需要保留兩個選項！');
                return;
            }
            row.remove();
            calculate();
        });

        container.appendChild(row);
    }

    function formatNumber(num) {
        return new Intl.NumberFormat('zh-TW').format(Math.floor(num));
    }

    function calculate() {
        const rows = Array.from(container.querySelectorAll('.option-row'));
        const myPoints = parseFloat(myPointsInput.value) || 0;

        let totalPool = 0;
        let totalRate = 0;
        const optionsData = [];

        // 1. Gather Data
        rows.forEach(row => {
            const name = row.querySelector('.opt-name').value;
            const rateStr = row.querySelector('.opt-rate').value;
            const poolStr = row.querySelector('.opt-pool').value;
            const color = row.dataset.color;

            const rate = parseFloat(rateStr);
            const pool = parseFloat(poolStr);

            if (!isNaN(pool)) {
                totalPool += pool;
            }

            // Only count rate if it is a number
            if (!isNaN(rate)) {
                totalRate += rate;
            }

            optionsData.push({
                name,
                rate: isNaN(rate) ? 0 : rate,
                pool: isNaN(pool) ? 0 : pool,
                color,
                ev: -1,
                odds: 0
            });
        });

        // 2. Update Total Rate Status
        totalRateDisplay.textContent = `總勝率: ${totalRate.toFixed(1)}%`;
        if (Math.abs(totalRate - 100) < 0.1) {
            totalRateDisplay.className = 'rate-status valid';
        } else {
            totalRateDisplay.className = 'rate-status invalid';
        }

        // 3. Validation: Need pools > 0
        if (totalPool === 0) {
            resetResult('請輸入下注量');
            return;
        }

        // 4. Calculate EV for each
        let bestOption = null;

        optionsData.forEach(opt => {
            if (opt.pool <= 0) {
                opt.odds = 0;
                opt.ev = -1;
                return;
            }

            // Odds = Total Pool / Option Pool
            opt.odds = totalPool / opt.pool;

            // Probability
            const p = opt.rate / 100;

            // EV = (p * Odds) - 1
            opt.ev = (p * opt.odds) - 1;

            if (!bestOption || opt.ev > bestOption.ev) {
                bestOption = opt;
            }
        });

        // 5. Decision
        if (!bestOption) {
            resetResult();
            return;
        }

        // Threshold: 10% (0.10)
        // Also check if total rate is somewhat realistic? (warn if < 99% or > 101%?)
        // users might just input partial data so we just calc EV based on what is there.

        const showRateWarning = Math.abs(totalRate - 100) > 1.0;
        const evThreshold = 0.10;

        // Reset Styles
        decisionCard.className = 'decision-card';
        decisionCard.style.borderColor = '';
        decisionCard.style.backgroundColor = '';
        decisionMainColor = '';

        if (bestOption.ev >= evThreshold) {
            // Bet this option
            decisionCard.style.borderColor = bestOption.color;
            decisionCard.style.backgroundColor = `${bestOption.color}10`; // 10% opacity hex
            decisionText.style.color = bestOption.color;

            decisionText.textContent = `下注 ${bestOption.name}`;

            let subText = `期望值 ${(bestOption.ev * 100).toFixed(1)}%`;
            if (showRateWarning) subText += ' (注意：總勝率非 100%)';
            decisionSub.textContent = subText;

            // Kelly
            const p = bestOption.rate / 100;
            const b = bestOption.odds - 1; // net odds
            // q = 1 - p (Probability of losing)
            // Fractional Kelly formula: f = (bp - q) / b
            let kellyF = 0;
            if (b > 0) {
                const q = 1 - p;
                kellyF = (b * p - q) / b;
            }

            kellyF = Math.max(0, Math.min(kellyF, 1)); // clamp 0-1

            evValue.textContent = (bestOption.ev * 100).toFixed(1) + '%';
            oddsValue.textContent = bestOption.odds.toFixed(2) + 'x';
            kellyFraction.textContent = (kellyF * 100).toFixed(1) + '%';

            let suggestedBet = 0;
            if (myPointsInput.value) {
                suggestedBet = Math.floor(myPoints * kellyF);
                betAmount.textContent = formatNumber(suggestedBet);
            } else {
                betAmount.textContent = (kellyF * 100).toFixed(1) + '% 資金';
            }

        } else {
            // Skip
            decisionCard.classList.add('skip');
            decisionText.style.color = 'var(--warning)';
            decisionText.textContent = '👀 觀望 (Skip)';

            let maxEVPercent = (bestOption.ev * 100).toFixed(1);
            if (bestOption.ev < 0) maxEVPercent = "負值";

            decisionSub.textContent = `最高獲利僅 ${maxEVPercent}% (建議 > 10%)`;

            evValue.textContent = (bestOption.ev * 100).toFixed(1) + '%';
            oddsValue.textContent = '--';
            betAmount.textContent = '0';
            kellyFraction.textContent = '0%';
        }
    }

    function resetResult(msg = '請輸入數據') {
        const decisionCard = document.getElementById('decision-card');
        const decisionText = document.getElementById('decision-text');

        decisionCard.className = 'decision-card';
        decisionCard.style.borderColor = '';
        decisionCard.style.backgroundColor = '';
        decisionText.style.color = '';

        document.getElementById('decision-text').textContent = msg;
        document.getElementById('decision-sub').textContent = '等待輸入...';
        document.getElementById('ev-value').textContent = '--';
        document.getElementById('odds-value').textContent = '--';
        document.getElementById('bet-amount').textContent = '--';
        document.getElementById('kelly-fraction').textContent = '--';
    }
});
