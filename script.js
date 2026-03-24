// ====================== ГЛОБАЛЬНЫЕ ДАННЫЕ ======================
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

// ====================== РАБОТА С ТАБАМИ ======================
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
    if (!name) return;
    
    assets.push({
        id: Date.now(),
        name: name,
        priority: 3,
        value: 1000000
    });
    renderAssets();
}

function renderAssets() {
    const container = document.getElementById('assetsList');
    container.innerHTML = assets.map(a => `
        <div class="card flex justify-between items-center">
            <div>
                <div class="font-semibold">${a.name}</div>
                <div class="text-xs text-muted">Приоритет: ${a.priority}</div>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold">${a.value.toLocaleString('ru')} ₽</div>
                <button onclick="deleteAsset(${a.id})" class="text-danger text-xs">удалить</button>
            </div>
        </div>
    `).join('');
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
    container.innerHTML = risks.map(r => {
        const isAcceptable = r.residualScore !== null 
            ? r.residualScore <= criteria.riskAppetite 
            : r.score <= criteria.riskAppetite;
        
        return `
            <div class="card flex gap-6">
                <div class="flex-1">
                    <div class="font-medium">${r.threat}</div>
                    <div class="text-sm text-muted">${r.vulnerability}</div>
                    <div class="mt-3 text-xs">
                        Исходный риск: <span class="font-mono font-bold text-danger">${r.score}</span> баллов
                    </div>
                    ${r.residualScore !== null ? 
                        `<div class="text-xs text-success">Остаточный: <span class="font-bold">${r.residualScore}</span></div>` : ''}
                </div>
                
                <div class="flex flex-col gap-2">
                    ${r.residualScore === null ? 
                        `<button onclick="attachMeasureToRisk(${r.id})" 
                                 class="btn btn-primary text-sm">Применить меру</button>` : ''}
                    <button onclick="deleteRisk(${r.id})" class="btn btn-secondary text-sm">Удалить</button>
                </div>
            </div>`;
    }).join('');
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
    container.innerHTML = measures.map(m => {
        const linkedRisk = risks.find(r => r.measureId === m.id);
        const effect = linkedRisk ? calculateExpectedLoss(linkedRisk.score) - calculateExpectedLoss(linkedRisk.residualScore) : 0;
        const rosi = calculateROSI(effect - m.cost, m.cost);
        
        return `
            <div class="card">
                <div class="flex justify-between">
                    <div class="font-semibold">${m.name}</div>
                    <div class="text-success font-bold">${m.cost.toLocaleString('ru')} ₽</div>
                </div>
                <div class="text-xs mt-4 text-muted">Снижение ущерба: ${m.reduceDamage}% | Вероятности: ${m.reduceProb}%</div>
                ${linkedRisk ? 
                    `<div class="mt-4 text-sm">Эффект: <span class="font-bold">${effect.toLocaleString('ru')} ₽</span><br>ROSI: <span class="text-primary">${rosi}%</span></div>` : 
                    `<button onclick="linkMeasure(${m.id})" class="mt-4 text-xs btn btn-secondary">Привязать к риску</button>`}
            </div>`;
    }).join('');
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
    last.innerHTML = risks.slice(0, 3).map(r => `
        <div class="card p-4 text-sm">
            <div class="font-medium">${r.threat}</div>
            <div class="text-xs text-muted">${r.score} → ${r.residualScore || '—'}</div>
        </div>
    `).join('');
}

// ====================== ТАБ ЭКОНОМИКА ======================
function renderEconomicTab() {
    const summary = document.getElementById('economicSummary');
    
    let totalBefore = risks.reduce((s, r) => s + calculateExpectedLoss(r.score), 0);
    let totalAfter = risks.reduce((s, r) => s + calculateExpectedLoss(r.residualScore || r.score), 0);
    let totalCost = measures.reduce((s, m) => s + m.cost, 0);
    let totalEffect = totalBefore - totalAfter - totalCost;
    
    summary.innerHTML = `
        <div class="space-y-6">
            <div>
                <div class="text-sm text-muted">До внедрения</div>
                <div class="text-4xl font-bold">${totalBefore.toLocaleString('ru')} ₽</div>
            </div>
            <div>
                <div class="text-sm text-muted">После внедрения</div>
                <div class="text-4xl font-bold text-success">${totalAfter.toLocaleString('ru')} ₽</div>
            </div>
            <div class="pt-4 border-t">
                <div class="text-sm text-muted">Чистый экономический эффект</div>
                <div class="text-5xl font-bold ${totalEffect > 0 ? 'text-success' : 'text-danger'}">
                    ${totalEffect.toLocaleString('ru')} ₽
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('formula1').innerHTML = `<strong>1. Риск</strong><br><span class="font-mono">damage × prob × priority</span><br><span class="text-xs text-muted">Базовая оценка риска по ГОСТ</span>`;
    document.getElementById('formula2').innerHTML = `<strong>2. Остаточный риск</strong><br><span class="font-mono">(damage × (1-rd)) × (prob × (1-rp)) × priority</span>`;
    document.getElementById('formula3').innerHTML = `<strong>3. ROSI</strong><br><span class="font-mono">(Эффект / Стоимость) × 100%</span><br><span class="text-xs text-muted">Возврат инвестиций в ИБ</span>`;
    document.getElementById('formula4').innerHTML = `<strong>4. Срок окупаемости</strong><br><span class="font-mono">Стоимость меры / Годовая экономия</span>`;
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
        {id: 2, name: 'Сервер 1С', priority: 3, value: 1200000}
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

    // Заполняем содержимое табов (так как в index.html они пустые)
    renderAllTabsContent();
    
    renderAssets();
    renderRisks();
    renderMeasures();
    renderDashboard();
}

function renderAllTabsContent() {
    // Таб 0 — Дашборд
    document.getElementById('content0').innerHTML = `
        <div class="grid grid-cols-4 gap-6">
            <div class="card">
                <p class="text-muted text-sm">Общий риск до мер</p>
                <p id="totalRiskBefore" class="text-5xl font-bold text-danger mt-2">248</p>
                <p class="text-xs text-muted">баллов по всем рискам</p>
            </div>
            <div class="card">
                <p class="text-muted text-sm">Общий риск после мер</p>
                <p id="totalRiskAfter" class="text-5xl font-bold text-success mt-2">47</p>
                <p class="text-xs text-muted">баллов</p>
            </div>
            <div class="card">
                <p class="text-muted text-sm">Экономический эффект</p>
                <p id="totalEffect" class="text-5xl font-bold text-success mt-2">1 840 000 ₽</p>
                <p class="text-xs text-muted">за год</p>
            </div>
            <div class="card">
                <p class="text-muted text-sm">Средний ROI</p>
                <p id="avgROI" class="text-5xl font-bold text-primary mt-2">312%</p>
            </div>
        </div>
        <div class="mt-10">
            <h2 class="text-xl font-semibold mb-4">Последние риски</h2>
            <div id="lastRisks" class="grid grid-cols-3 gap-4"></div>
        </div>
    `;

    // Таб 1 — Критерии
    document.getElementById('content1').innerHTML = `
        <div class="max-w-2xl mx-auto card p-8">
            <h2 class="text-2xl font-bold mb-6">Настройка критериев (ГОСТ Р 27005)</h2>
            <div class="space-y-8">
                <div>
                    <label class="block text-sm font-medium mb-2">Формула риска</label>
                    <div class="text-3xl font-bold text-primary">Риск = Ущерб × Вероятность × Приоритет актива</div>
                </div>
                <div class="grid grid-cols-3 gap-6">
                    <div>
                        <label class="block text-sm mb-1">Уровень ущерба (баллы)</label>
                        <input type="range" id="damageMax" min="1" max="4" value="4" class="w-full">
                        <div class="flex justify-between text-xs"><span>1</span><span id="damageVal">4</span></div>
                    </div>
                    <div>
                        <label class="block text-sm mb-1">Вероятность (баллы)</label>
                        <input type="range" id="probMax" min="1" max="4" value="4" class="w-full">
                        <div class="flex justify-between text-xs"><span>1</span><span id="probVal">4</span></div>
                    </div>
                    <div>
                        <label class="block text-sm mb-1">Приоритет актива (баллы)</label>
                        <input type="range" id="priorityMax" min="1" max="4" value="4" class="w-full">
                        <div class="flex justify-between text-xs"><span>1</span><span id="priorityVal">4</span></div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm mb-3">Риск-аппетит (макс. допустимый балл)</label>
                    <input type="range" id="riskAppetite" min="4" max="32" value="12" step="1" class="w-full" style="accent-color: var(--success-color)">
                    <div class="flex justify-between font-mono text-sm">
                        <span>Низкий</span>
                        <span id="appetiteValue" class="font-bold text-xl">12</span>
                        <span>Средний / Высокий</span>
                    </div>
                </div>
                <button onclick="saveCriteria()" 
                        class="w-full py-4 btn btn-primary font-medium">Сохранить критерии</button>
            </div>
        </div>
    `;

    // Таб 2 — Активы
    document.getElementById('content2').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Реестр активов</h2>
            <button onclick="addAsset()" class="btn btn-primary flex items-center gap-2">
                + Добавить актив
            </button>
        </div>
        <div id="assetsList" class="grid grid-cols-2 gap-4"></div>
    `;

    // Таб 3 — Риски
    document.getElementById('content3').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Реестр рисков</h2>
            <button onclick="addRisk()" class="btn btn-primary flex items-center gap-2">
                + Добавить риск
            </button>
        </div>
        <div id="risksList" class="space-y-4"></div>
    `;

    // Таб 4 — Защитные меры
    document.getElementById('content4').innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Защитные меры и их влияние</h2>
        <div id="measuresList" class="grid grid-cols-2 gap-6"></div>
        <button onclick="addMeasure()" 
                class="mt-8 btn btn-primary flex items-center gap-2 mx-auto">
            + Создать новую защитную меру
        </button>
    `;

    // Таб 5 — Экономика
    document.getElementById('content5').innerHTML = `
        <h2 class="text-2xl font-bold mb-8">Экономическая эффективность внедрения ИБ</h2>
        <div class="card p-8 mb-8">
            <div class="grid grid-cols-2 gap-12">
                <div>
                    <h3 class="font-medium mb-4">Стоимость 1 балла риска</h3>
                    <input id="costPerPoint" type="number" value="50000" 
                           class="w-full text-4xl font-bold text-right bg-transparent focus:outline-none"
													 style="border-bottom: 2px solid var(--primary-color)">
                    <p class="text-sm text-muted">рублей за 1 балл риска</p>
                </div>
                <div id="economicSummary" class="text-right"></div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-8">
            <div class="card p-8">
                <h3 class="font-semibold mb-4">Дополнительные формулы</h3>
                <ul class="space-y-6 text-sm" id="formulasList">
                    <li id="formula1"></li>
                    <li id="formula2"></li>
                    <li id="formula3"></li>
                    <li id="formula4"></li>
                </ul>
            </div>
            <div class="card p-8">
                <canvas id="chart" width="400" height="300"></canvas>
            </div>
        </div>
    `;
}

// Запуск приложения
window.onload = initApp;