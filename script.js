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
    const priority = prompt('Приоритет актива (1-4)', '3');
    if (!name || !value || !priority) return;
    
    const prioNum = parseInt(priority);
    if (isNaN(prioNum) || prioNum < 1 || prioNum > 4) {
        alert('Приоритет должен быть числом от 1 до 4');
        return;
    }
    
    assets.push({
        id: Date.now(),
        name: name,
        priority: prioNum,
        value: parseInt(value)
    });
    renderAssets();
}

// Пересчет рисков при изменении приоритета актива
function updateAssetPriority(assetId, newPriority) {
    if (newPriority < 1 || newPriority > 4) {
        console.error('Приоритет должен быть от 1 до 4');
        return;
    }
    
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    const oldPriority = asset.priority;
    asset.priority = newPriority;
    
    // Пересчитываем все риски, связанные с этим активом
    const linkedRisks = risks.filter(r => r.assetId === assetId);
    let recalculatedCount = 0;
    
    linkedRisks.forEach(r => {
        r.priority = newPriority;
        r.score = calculateRisk(r.damage, r.probability, r.priority);
        
        // Пересчитываем остаточный риск, если мера привязана
        if (r.residualScore !== null) {
            r.residualScore = calculateResidualRisk(r, r.reduceDamage, r.reduceProb);
        }
        recalculatedCount++;
    });
    
    const message = `✅ Актив "${asset.name}": приоритет ${oldPriority} → ${newPriority}. Пересчитано рисков: ${recalculatedCount}`;
    console.log(message);
    
    // Обновляем UI
    renderAssets();
    if (recalculatedCount > 0) {
        renderRisks();
        renderMeasures(); // Добавлено: обновляем меры, так как их эффект мог измениться
        renderDashboard();
    }
}

function renderAssets() {
    const container = document.getElementById('assetsList');
    const template = document.getElementById('assetTemplate');
    container.innerHTML = '';
    assets.forEach(a => {
        const assetEl = template.content.cloneNode(true);
        assetEl.querySelector('[data-template="name"]').textContent = a.name;
        
        // Привязываем ползунок приоритета к функции обновления
        const priorityInput = assetEl.querySelector('[data-template="priority-container"] input');
        priorityInput.value = a.priority;
        priorityInput.onchange = (e) => updateAssetPriority(a.id, parseInt(e.target.value));
        
        const priorityValue = assetEl.querySelector('[data-template="priority-value"]');
        priorityInput.oninput = (e) => {
            priorityValue.textContent = e.target.value;
        };
        
        assetEl.querySelector('[data-template="value"]').textContent = `${a.value.toLocaleString('ru')} ₽`;
        
        // Показываем количество рисков для этого актива
        const riskCount = risks.filter(r => r.assetId === a.id).length;
        const riskInfo = assetEl.querySelector('[data-template="risk-info"]');
        if (riskInfo) {
            riskInfo.textContent = riskCount > 0 ? `${riskCount} риск${riskCount === 1 ? '' : 'ов'} привязано` : 'Нет рисков';
        }
        
        assetEl.querySelector('[data-template="delete-btn"]').onclick = () => deleteAsset(a.id);
        container.appendChild(assetEl);
    });
}

// ====================== РИСКИ ======================
function addRisk() {
    if (assets.length === 0) {
        alert('❌ Сначала создайте актив!');
        return;
    }
    
    const threat = prompt('Угроза', 'Несанкционированный доступ');
    const vuln = prompt('Уязвимость', 'Отсутствие контроля доступа');
    if (!threat || !vuln) return;
    
    // Предлагаем выбрать актив
    let assetList = assets.map((a, idx) => `${idx}: ${a.name} (приоритет: ${a.priority})`).join('\n');
    const assetIdxStr = prompt(`Выберите актив (введите номер):\n${assetList}`, '0');
    if (assetIdxStr === null) return;
    
    const assetIdx = parseInt(assetIdxStr);
    if (isNaN(assetIdx) || assetIdx < 0 || assetIdx >= assets.length) {
        alert('Неверный номер актива');
        return;
    }
    
    const asset = assets[assetIdx];
    
    const damage = Math.floor(Math.random() * criteria.damageMax) + 1;
    const prob = Math.floor(Math.random() * criteria.probMax) + 1;
    
    // Риск создается с приоритетом актива
    risks.push({
        id: Date.now(),
        threat: threat,
        vulnerability: vuln,
        assetId: asset.id,
        damage: damage,
        probability: prob,
        priority: asset.priority,
        score: calculateRisk(damage, prob, asset.priority),
        residualScore: null,
        measureId: null,
        reduceDamage: 0,
        reduceProb: 0
    });
    
    console.log(`✅ Риск добавлен к активу "${asset.name}" (приоритет: ${asset.priority})`);
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
        
        // Показываем информацию об активе и приоритете
        const asset = assets.find(a => a.id === r.assetId);
        const assetInfoContainer = riskEl.querySelector('[data-template="asset-info"]');
        if (assetInfoContainer) {
            if (asset) {
                assetInfoContainer.textContent = `Актив: ${asset.name} (приоритет: ${r.priority})`;
            } else {
                assetInfoContainer.textContent = `ID актива: ${r.assetId} (приоритет: ${r.priority})`;
            }
        }

        // Добавляем ID риска для привязки мер
        riskEl.querySelector('[data-template="riskId"]').textContent = r.id;

        const residualContainer = riskEl.querySelector('[data-template="residual-container"]');
        if (r.residualScore !== null) {
            residualContainer.querySelector('[data-template="residualScore"]').textContent = r.residualScore;
        } else {
            residualContainer.remove();
        }
        
        riskEl.querySelector('[data-template="delete-btn"]').onclick = () => deleteRisk(r.id);
        container.appendChild(riskEl);
    });
}

// ====================== ЗАЩИТНЫЕ МЕРЫ ======================
let currentMeasureIdForLinking = null;

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
            linkBtn.onclick = () => openLinkMeasureModal(m.id);
        }
        container.appendChild(measureEl);
    });
}

function openLinkMeasureModal(measureId) {
    currentMeasureIdForLinking = measureId;
    const modal = document.getElementById('linkMeasureModal');
    const select = document.getElementById('riskSelect');
    
    // Очищаем предыдущие опции
    select.innerHTML = '<option value="">Выберите риск...</option>';
    
    // Добавляем опции для каждого риска без привязанной меры
    risks.filter(r => !r.measureId).forEach(r => {
        const asset = assets.find(a => a.id === r.assetId);
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = `${r.threat} (${asset ? asset.name : 'Актив ID:' + r.assetId}) - Риск: ${r.score}`;
        select.appendChild(option);
    });
    
    modal.classList.remove('hidden');
}

function closeLinkMeasureModal() {
    document.getElementById('linkMeasureModal').classList.add('hidden');
    currentMeasureIdForLinking = null;
}

function confirmLinkMeasure() {
    const select = document.getElementById('riskSelect');
    const riskId = select.value;
    
    if (!riskId) {
        alert('Выберите риск!');
        return;
    }
    
    const risk = risks.find(r => r.id == riskId);
    if (!risk) {
        alert('Риск не найден');
        return;
    }
    
    const measure = measures.find(m => m.id === currentMeasureIdForLinking);
    if (!measure) {
        alert('Мера не найдена');
        return;
    }
    
    risk.measureId = currentMeasureIdForLinking;
    risk.reduceDamage = measure.reduceDamage;
    risk.reduceProb = measure.reduceProb;
    risk.residualScore = calculateResidualRisk(risk, measure.reduceDamage, measure.reduceProb);
    
    closeLinkMeasureModal();
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
    const asset = assets.find(a => a.id === id);
    const linkedRisks = risks.filter(r => r.assetId === id);
    
    if (linkedRisks.length > 0) {
        const confirm_delete = confirm(`Актив "${asset.name}" имеет ${linkedRisks.length} риск(ов). Они будут удалены. Продолжить?`);
        if (!confirm_delete) return;
    }
    
    assets = assets.filter(a => a.id !== id); 
    risks = risks.filter(r => r.assetId !== id);
    
    if (linkedRisks.length > 0) {
        renderRisks();
        renderDashboard();
    }
    
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
    
    // Обработчики для модального окна
    document.getElementById('cancelLinkBtn').onclick = closeLinkMeasureModal;
    document.getElementById('confirmLinkBtn').onclick = confirmLinkMeasure;
    
    renderAssets();
    renderRisks();
    renderMeasures();
    renderDashboard();
}

// Запуск приложения
window.onload = initApp;