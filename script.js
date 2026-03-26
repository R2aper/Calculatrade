// ====================== ДАННЫЕ ======================
let criteria = {
    formula: "damage * probability * priority",
    damageMax: 4,
    probMax: 4,
    priorityMax: 4,
    riskAppetite: 12,
    costPerPoint: 50000
};

let assets = [];
let risks = [];
let measures = [];

// ====================== ФОРМУЛЫ ======================
function calculateRisk(damage, probability, priority) {
    return damage * probability * priority;
}

function calculateResidualRisk(risk, reduceDamage, reduceProb) {
    const newDamage = risk.damage * (1 - reduceDamage / 100);
    const newProb = risk.probability * (1 - reduceProb / 100);
    return Math.max(1, Math.round(newDamage * newProb * risk.priority));
}

function calculateExpectedLoss(riskScore) {
    return riskScore * criteria.costPerPoint;
}

function calculateROSI(effect, cost) {
    return cost > 0 ? Math.round((effect / cost) * 100) : 0;
}

function calculatePayback(cost, annualSaving) {
    return annualSaving > 0 ? (cost / annualSaving).toFixed(1) : "∞";
}

// ====================== ТАБАМИ ======================
function showTab(n) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('content' + n).classList.remove('hidden');
    
    document.querySelectorAll('nav a').forEach(el => el.classList.remove('tab-active'));
    document.getElementById('tab' + n).classList.add('tab-active');
    
    if (n === 5) renderEconomicTab();
}

// ====================== КРИТЕРИИ ======================
function saveCriteria() {
    criteria.damageMax = +document.getElementById('damageMax').value;
    criteria.probMax = +document.getElementById('probMax').value;
    criteria.priorityMax = +document.getElementById('priorityMax').value;
    criteria.riskAppetite = +document.getElementById('riskAppetite').value;
    criteria.costPerPoint = +document.getElementById('costPerPoint').value || 50000;
    
    alert('✅ Критерии сохранены!');
    renderDashboard();
}

// ====================== АКТИВЫ ======================
function addAsset() {
    const name = prompt('Название актива (например: База ПДн)', 'База персональных данных');
    const value = prompt('Стоимость актива', '1000000');
    const priority = prompt('Приоритет актива', '3');
    if (!name || !value || !priority) return;
    
    assets.push({
        id: Date.now(),
        name: name,
        priority: parseInt(priority),
        value: parseInt(value)
    });
    renderAssets();
}

function renderAssets() {
    const container = document.getElementById('assetsList');
    const template = document.getElementById('assetTemplate');
    container.innerHTML = '';
    assets.forEach(a => {
        const assetEl = template.content.cloneNode(true);
        assetEl.querySelector('[data-template="name"]').textContent = a.name;
        assetEl.querySelector('[data-template="priority"]').textContent = `Приоритет: ${a.priority}`;
        assetEl.querySelector('[data-template="value"]').textContent = `${a.value.toLocaleString('ru')} ₽`;
        assetEl.querySelector('[data-template="delete-btn"]').onclick = () => deleteAsset(a.id);
        container.appendChild(assetEl);
    });
}

// ====================== РИСКИ ======================
function addRisk() {
    const threat = prompt('Угроза', 'Несанкционированный доступ');
    const vuln = prompt('Уязвимость', 'Отсутствие контроля доступа');
    if (!threat || !vuln) return;
    
    const damage = Math.floor(Math.random() * criteria.damageMax) + 1;
    const prob = Math.floor(Math.random() * criteria.probMax) + 1;
    const prio = assets.length ? assets[0].priority : 3;
    
    risks.push({
        id: Date.now(),
        threat: threat,
        vulnerability: vuln,
        assetId: assets.length ? assets[0].id : null,
        damage: damage,
        probability: prob,
        priority: prio,
        score: calculateRisk(damage, prob, prio),
        residualScore: null,
        measureId: null,
        reduceDamage: 0,
        reduceProb: 0
    });
    
    renderRisks();
    renderDashboard();
}

function renderRisks() {
    const container = document.getElementById('risksList');
    const template = document.getElementById('riskTemplate');
    container.innerHTML = '';
    risks.forEach(r => {
        const riskEl = template.content.cloneNode(true);
        riskEl.querySelector('[data-template="threat"]').textContent = r.threat;
        riskEl.querySelector('[data-template="vulnerability"]').textContent = r.vulnerability;
        riskEl.querySelector('[data-template="score"]').textContent = r.score;
        riskEl.querySelector('[data-template="assetId"]').textContent = r.id;

        const residualContainer = riskEl.querySelector('[data-template="residual-container"]');
        if (r.residualScore !== null) {
            residualContainer.querySelector('[data-template="residualScore"]').textContent = r.residualScore;
        } else {
            residualContainer.remove();
        }
        
        const applyBtn = riskEl.querySelector('[data-template="apply-measure-btn"]');
        if (r.residualScore === null) {
            applyBtn.onclick = () => attachMeasureToRisk(r.id);
        } else {
            applyBtn.remove();
        }
        
        riskEl.querySelector('[data-template="delete-btn"]').onclick = () => deleteRisk(r.id);
        container.appendChild(riskEl);
    });
}

// ====================== ЗАЩИТНЫЕ МЕРЫ ======================
function addMeasure() {
    const name = prompt('Название защитной меры (например: Система контроля доступа)', 'Многофакторная аутентификация');
    if (!name) return;
    
    const cost = +prompt('Стоимость внедрения (руб)', '450000') || 450000;
    
    measures.push({
        id: Date.now(),
        name: name,
        cost: cost,
        reduceDamage: 40,
        reduceProb: 80,
        linkedRiskId: null
    });
    
    renderMeasures();
}

function renderMeasures() {
    const container = document.getElementById('measuresList');
    const template = document.getElementById('measureTemplate');
    container.innerHTML = '';
    measures.forEach(m => {
        const measureEl = template.content.cloneNode(true);
        measureEl.querySelector('[data-template="name"]').textContent = m.name;
        measureEl.querySelector('[data-template="cost"]').textContent = `${m.cost.toLocaleString('ru')} ₽`;
        measureEl.querySelector('[data-template="reduction"]').textContent = `Снижение ущерба: ${m.reduceDamage}% | Вероятности: ${m.reduceProb}%`;
        
        const linkedRisk = risks.find(r => r.measureId === m.id);
        const effectContainer = measureEl.querySelector('[data-template="effect-container"]');
        const linkBtn = measureEl.querySelector('[data-template="link-btn"]');
        const deleteBtn = measureEl.querySelector('[data-template="delete-btn"]');

        deleteBtn.onclick = () => deleteMeasure(m.id);

        if (linkedRisk) {
            const effect = calculateExpectedLoss(linkedRisk.score) - calculateExpectedLoss(linkedRisk.residualScore);
            const rosi = calculateROSI(effect - m.cost, m.cost);
            effectContainer.querySelector('[data-template="effect"]').textContent = `${effect.toLocaleString('ru')} ₽`;
            effectContainer.querySelector('[data-template="rosi"]').textContent = `${rosi}%`;
            linkBtn.remove();
        } else {
            effectContainer.remove();
            linkBtn.onclick = () => linkMeasure(m.id);
        }
        container.appendChild(measureEl);
    });
}

function attachMeasureToRisk(riskId) {
    if (measures.length === 0) {
        alert('Сначала создайте защитную меру!');
        return;
    }
    
    const risk = risks.find(r => r.id === riskId);
    const measure = measures[0];
    
    risk.measureId = measure.id;
    risk.reduceDamage = measure.reduceDamage;
    risk.reduceProb = measure.reduceProb;
    risk.residualScore = calculateResidualRisk(risk, measure.reduceDamage, measure.reduceProb);
    
    renderRisks();
    renderMeasures();
    renderDashboard();
}

function linkMeasure(measureId) {
    const riskId = prompt('Введите ID риска (посмотрите в реестре рисков)', risks[0]?.id);
    if (!riskId) return;
    
    const risk = risks.find(r => r.id == riskId);
    if (!risk) return alert('Риск не найден');
    
    risk.measureId = measureId;
    const measure = measures.find(m => m.id === measureId);
    
    risk.reduceDamage = measure.reduceDamage;
    risk.reduceProb = measure.reduceProb;
    risk.residualScore = calculateResidualRisk(risk, measure.reduceDamage, measure.reduceProb);
    
    renderRisks();
    renderMeasures();
    renderDashboard();
}

// ====================== УДАЛЕНИЕ ======================
function deleteAsset(id) { 
    assets = assets.filter(a => a.id !== id); 
    renderAssets(); 
}

function deleteRisk(id) { 
    risks = risks.filter(r => r.id !== id); 
    renderRisks(); 
    renderDashboard(); 
}

function deleteMeasure(id) { 
    measures = measures.filter(m => m.id !== id); 
    risks.forEach(r => {
        if (r.measureId === id) {
            r.measureId = null;
            r.reduceDamage = 0;
            r.reduceProb = 0;
            r.residualScore = null;
        }
    });
    renderMeasures(); 
    renderRisks(); 
    renderDashboard();
}

// ====================== ДАШБОРД ======================
function renderDashboard() {
    let totalBefore = risks.reduce((sum, r) => sum + r.score, 0);
    let totalAfter = risks.reduce((sum, r) => sum + (r.residualScore || r.score), 0);
    
    document.getElementById('totalRiskBefore').textContent = totalBefore;
    document.getElementById('totalRiskAfter').textContent = totalAfter;
    
    const totalEffect = risks.reduce((sum, r) => {
        if (r.residualScore === null) return sum;
        const lossBefore = calculateExpectedLoss(r.score);
        const lossAfter = calculateExpectedLoss(r.residualScore);
        return sum + (lossBefore - lossAfter);
    }, 0);
    
    document.getElementById('totalEffect').textContent = totalEffect.toLocaleString('ru') + ' ₽';
    
    const rosis = risks.filter(r => r.residualScore !== null).map(r => {
        const effect = calculateExpectedLoss(r.score) - calculateExpectedLoss(r.residualScore);
        const cost = measures.find(m => m.id === r.measureId)?.cost || 100000;
        return calculateROSI(effect - cost, cost);
    });
    const avg = rosis.length ? Math.round(rosis.reduce((a,b)=>a+b,0)/rosis.length) : 0;
    document.getElementById('avgROI').textContent = avg + '%';
    
    const last = document.getElementById('lastRisks');
    const template = document.getElementById('lastRiskTemplate');
    last.innerHTML = '';
    risks.slice(0, 3).forEach(r => {
        const riskEl = template.content.cloneNode(true);
        riskEl.querySelector('[data-template="threat"]').textContent = r.threat;
        riskEl.querySelector('[data-template="scores"]').textContent = `${r.score} → ${r.residualScore || '—'}`;
        last.appendChild(riskEl);
    });
}

// ====================== ТАБ ЭКОНОМИКА ======================
function renderEconomicTab() {
    let totalBefore = risks.reduce((s, r) => s + calculateExpectedLoss(r.score), 0);
    let totalAfter = risks.reduce((s, r) => s + calculateExpectedLoss(r.residualScore || r.score), 0);
    let totalCost = measures.reduce((s, m) => s + m.cost, 0);
    let totalEffect = totalBefore - totalAfter - totalCost;
    
    document.getElementById('summaryBefore').textContent = `${totalBefore.toLocaleString('ru')} ₽`;
    document.getElementById('summaryAfter').textContent = `${totalAfter.toLocaleString('ru')} ₽`;
    const summaryEffectEl = document.getElementById('summaryEffect');
    summaryEffectEl.textContent = `${totalEffect.toLocaleString('ru')} ₽`;
    
    summaryEffectEl.classList.toggle('text-success', totalEffect > 0);
    summaryEffectEl.classList.toggle('text-danger', totalEffect <= 0);
}

// ====================== СБРОС ======================
function resetAll() {
    if (confirm('Сбросить ВСЕ данные?')) {
        assets = [];
        risks = [];
        measures = [];
        renderAssets();
        renderRisks();
        renderMeasures();
        renderDashboard();
        alert('Данные очищены');
    }
}

// ====================== ИНИЦИАЛИЗАЦИЯ ======================
function initApp() {
    // демо-данные
    assets = [
        {id: 1, name: 'База ПДн', priority: 4, value: 2500000},
        {id: 2, name: 'Сервер 1С', priority: 3, value: 120000}
    ];
    
    risks = [
        {
            id: 101, 
            threat: 'Несанкционированный доступ', 
            vulnerability: 'Слабый пароль',
            damage: 4, 
            probability: 3, 
            priority: 4,
            score: 48, 
            residualScore: 8, 
            measureId: 201,
            reduceDamage: 30, 
            reduceProb: 90
        }
    ];
    
    measures = [
        {id: 201, name: 'Многофакторная аутентификация', cost: 380000, reduceDamage: 30, reduceProb: 90}
    ];
    
    renderAssets();
    renderRisks();
    renderMeasures();
    renderDashboard();
}

// Запуск приложения
window.onload = initApp;