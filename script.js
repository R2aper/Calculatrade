// ====================== ALPINE.JS КОМПОНЕНТ ======================
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        currentTab: 0,
        criteria: {
            formula: "damage * probability * priority",
            damageMax: 4,
            probMax: 4,
            priorityMax: 4,
            riskAppetite: 12,
            costPerPoint: 50000
        },
        assets: [],
        risks: [],
        measures: [],
        currentMeasureIdForLinking: null,
        linkMeasureModalOpen: false,
        linkMeasureRiskModalOpen: false,
        currentRiskIdForMeasureLinking: null,

        // ====================== МОДАЛЬНЫЕ ОКНА ДОБАВЛЕНИЯ ======================
        addAssetModalOpen: false,
        addRiskModalOpen: false,
        addMeasureModalOpen: false,

        // ====================== ФОРМА ДОБАВЛЕНИЯ АКТИВА ======================
        assetForm: {
            name: '',
            value: '',
            priority: 3
        },

        // ====================== ФОРМА ДОБАВЛЕНИЯ РИСКА ======================
        riskForm: {
            threat: '',
            vulnerability: '',
            assetId: null,
            damage: 2,
            probability: 2
        },

        // ====================== ФОРМА ДОБАВЛЕНИЯ ЗАЩИТНОЙ МЕРЫ ======================
        measureForm: {
            name: '',
            cost: '',
            reduceDamage: 40,
            reduceProb: 80
        },

        // ====================== СИСТЕМА УВЕДОМЛЕНИЙ ======================
        notification: {
            show: false,
            message: '',
            type: 'success' // 'success', 'error', 'info'
        },
        notificationTimeout: null,

        // ====================== МЕТОДЫ ТАБОВ ======================
        showTab(n) {
            this.currentTab = n;
        },

        // ====================== МЕТОДЫ УВЕДОМЛЕНИЙ ======================
        showNotification(message, type = 'success', duration = 3000) {
            // Очищаем предыдущий тайм-аут если есть
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
            }
            
            this.notification.message = message;
            this.notification.type = type;
            this.notification.show = true;
            
            // Автоматическое скрытие через duration
            this.notificationTimeout = setTimeout(() => {
                this.notification.show = false;
            }, duration);
        },

        hideNotification() {
            this.notification.show = false;
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
            }
        },

        // ====================== МЕТОДЫ КРИТЕРИЕВ ======================
        saveCriteria() {
            // В Alpine.js x-model автоматически синхронизирует значения
            // Критерии уже обновлены, просто показываем уведомление
            this.showNotification('✅ Критерии сохранены!', 'success');
        },

        // ====================== МЕТОДЫ АКТИВОВ ======================
        openAddAssetModal() {
            this.assetForm = { name: '', value: '', priority: 3 };
            this.addAssetModalOpen = true;
        },

        closeAddAssetModal() {
            this.addAssetModalOpen = false;
            this.assetForm = { name: '', value: '', priority: 3 };
        },

        submitAsset() {
            if (!this.assetForm.name.trim()) {
                this.showNotification('❌ Введите название актива', 'error');
                return;
            }
            if (!this.assetForm.value || isNaN(this.assetForm.value)) {
                this.showNotification('❌ Введите корректную стоимость', 'error');
                return;
            }
            if (this.assetForm.priority < 1 || this.assetForm.priority > 4) {
                this.showNotification('❌ Приоритет должен быть от 1 до 4', 'error');
                return;
            }

            this.assets.push({
                id: Date.now(),
                name: this.assetForm.name,
                priority: parseInt(this.assetForm.priority),
                value: parseInt(this.assetForm.value)
            });

            this.closeAddAssetModal();
            this.showNotification(`✅ Актив "${this.assetForm.name}" добавлен`, 'success');
        },

        updateAssetPriority(assetId, newPriority) {
            if (newPriority < 1 || newPriority > 4) {
                console.error('Приоритет должен быть от 1 до 4');
                return;
            }
            
            const asset = this.assets.find(a => a.id === assetId);
            if (!asset) return;
            
            const oldPriority = asset.priority;
            asset.priority = newPriority;
            
            const linkedRisks = this.risks.filter(r => r.assetId === assetId);
            let recalculatedCount = 0;
            
            linkedRisks.forEach(r => {
                r.priority = newPriority;
                r.score = this.calculateRisk(r.damage, r.probability, r.priority);
                
                if (r.residualScore !== null) {
                    r.residualScore = this.calculateResidualRisk(r, r.reduceDamage, r.reduceProb);
                }
                recalculatedCount++;
            });
            
            console.log(`✅ Актив "${asset.name}": приоритет ${oldPriority} → ${newPriority}. Пересчитано рисков: ${recalculatedCount}`);
            
            // Alpine.js автоматически обновит всё благодаря реактивности
        },

        deleteAsset(id) { 
            const asset = this.assets.find(a => a.id === id);
            const linkedRisks = this.risks.filter(r => r.assetId === id);
            
            if (linkedRisks.length > 0) {
                const confirm_delete = confirm(`Актив "${asset.name}" имеет ${linkedRisks.length} риск(ов). Они будут удалены. Продолжить?`);
                if (!confirm_delete) return;
            }
            
            this.assets = this.assets.filter(a => a.id !== id); 
            this.risks = this.risks.filter(r => r.assetId !== id);
        },

        // ====================== МЕТОДЫ РИСКОВ ======================
        openAddRiskModal() {
            if (this.assets.length === 0) {
                this.showNotification('❌ Сначала создайте актив!', 'error');
                return;
            }
            this.riskForm = {
                threat: '',
                vulnerability: '',
                assetId: this.assets[0].id,
                damage: 2,
                probability: 2
            };
            this.addRiskModalOpen = true;
        },

        closeAddRiskModal() {
            this.addRiskModalOpen = false;
            this.riskForm = { threat: '', vulnerability: '', assetId: null, damage: 2, probability: 2 };
        },

        submitRisk() {
            if (!this.riskForm.threat.trim()) {
                this.showNotification('❌ Введите описание угрозы', 'error');
                return;
            }
            if (!this.riskForm.vulnerability.trim()) {
                this.showNotification('❌ Введите описание уязвимости', 'error');
                return;
            }
            if (!this.riskForm.assetId) {
                this.showNotification('❌ Выберите актив', 'error');
                return;
            }

            const asset = this.assets.find(a => a.id === this.riskForm.assetId);
            if (!asset) {
                this.showNotification('❌ Актив не найден', 'error');
                return;
            }

            this.risks.push({
                id: Date.now(),
                threat: this.riskForm.threat,
                vulnerability: this.riskForm.vulnerability,
                assetId: asset.id,
                damage: parseInt(this.riskForm.damage),
                probability: parseInt(this.riskForm.probability),
                priority: asset.priority,
                score: this.calculateRisk(this.riskForm.damage, this.riskForm.probability, asset.priority),
                residualScore: null,
                measureId: null,
                reduceDamage: 0,
                reduceProb: 0
            });

            this.closeAddRiskModal();
            this.showNotification(`✅ Риск добавлен к активу "${asset.name}"`, 'success');
        },

        deleteRisk(id) { 
            this.risks = this.risks.filter(r => r.id !== id); 
        },

        // ====================== МЕТОДЫ ЗАЩИТНЫХ МЕР ======================
        openAddMeasureModal() {
            this.measureForm = { name: '', cost: '', reduceDamage: 40, reduceProb: 80 };
            this.addMeasureModalOpen = true;
        },

        closeAddMeasureModal() {
            this.addMeasureModalOpen = false;
            this.measureForm = { name: '', cost: '', reduceDamage: 40, reduceProb: 80 };
        },

        submitMeasure() {
            if (!this.measureForm.name.trim()) {
                this.showNotification('❌ Введите название защитной меры', 'error');
                return;
            }
            if (!this.measureForm.cost || isNaN(this.measureForm.cost)) {
                this.showNotification('❌ Введите корректную стоимость', 'error');
                return;
            }
            if (this.measureForm.reduceDamage < 0 || this.measureForm.reduceDamage > 100) {
                this.showNotification('❌ Снижение ущерба должно быть 0-100%', 'error');
                return;
            }
            if (this.measureForm.reduceProb < 0 || this.measureForm.reduceProb > 100) {
                this.showNotification('❌ Снижение вероятности должно быть 0-100%', 'error');
                return;
            }

            this.measures.push({
                id: Date.now(),
                name: this.measureForm.name,
                cost: parseInt(this.measureForm.cost),
                reduceDamage: parseInt(this.measureForm.reduceDamage),
                reduceProb: parseInt(this.measureForm.reduceProb),
                linkedRiskId: null
            });

            this.closeAddMeasureModal();
            this.showNotification(`✅ Защитная мера "${this.measureForm.name}" добавлена`, 'success');
        },

        deleteMeasure(id) { 
            this.measures = this.measures.filter(m => m.id !== id); 
            this.risks.forEach(r => {
                if (r.measureId === id) {
                    r.measureId = null;
                    r.reduceDamage = 0;
                    r.reduceProb = 0;
                    r.residualScore = null;
                }
            });
        },

        openLinkMeasureModal(measureId) {
            this.currentMeasureIdForLinking = measureId;
            this.linkMeasureModalOpen = true;
        },

        closeLinkMeasureModal() {
            this.linkMeasureModalOpen = false;
            this.currentMeasureIdForLinking = null;
        },

        openLinkMeasureRiskModal(measureId) {
            this.currentMeasureIdForLinking = measureId;
            this.linkMeasureRiskModalOpen = true;
        },

        closeLinkMeasureRiskModal() {
            this.linkMeasureRiskModalOpen = false;
            this.currentMeasureIdForLinking = null;
        },

        confirmLinkMeasure() {
            const select = document.getElementById('riskSelect');
            const riskId = select.value;
            
            if (!riskId) {
                this.showNotification('❌ Выберите риск!', 'error');
                return;
            }
            
            const risk = this.risks.find(r => r.id == riskId);
            if (!risk) {
                this.showNotification('❌ Риск не найден', 'error');
                return;
            }
            
            const measure = this.measures.find(m => m.id === this.currentMeasureIdForLinking);
            if (!measure) {
                this.showNotification('❌ Мера не найдена', 'error');
                return;
            }
            
            risk.measureId = this.currentMeasureIdForLinking;
            risk.reduceDamage = measure.reduceDamage;
            risk.reduceProb = measure.reduceProb;
            risk.residualScore = this.calculateResidualRisk(risk, measure.reduceDamage, measure.reduceProb);
            
            this.closeLinkMeasureModal();
            this.showNotification(`✅ Мера привязана к риску "${risk.threat}"`, 'success');
        },

        confirmLinkMeasureRisk() {
            const select = document.getElementById('riskSelectForMeasure');
            const riskId = select.value;
            
            if (!riskId) {
                this.showNotification('❌ Выберите риск!', 'error');
                return;
            }
            
            const risk = this.risks.find(r => r.id == riskId);
            if (!risk) {
                this.showNotification('❌ Риск не найден', 'error');
                return;
            }
            
            const measure = this.measures.find(m => m.id === this.currentMeasureIdForLinking);
            if (!measure) {
                this.showNotification('❌ Мера не найдена', 'error');
                return;
            }
            
            // Проверяем, есть ли уже привязанная мера
            if (risk.measureId) {
                this.showNotification('⚠️ К этому риску уже привязана мера', 'error');
                return;
            }
            
            risk.measureId = this.currentMeasureIdForLinking;
            risk.reduceDamage = measure.reduceDamage;
            risk.reduceProb = measure.reduceProb;
            risk.residualScore = this.calculateResidualRisk(risk, measure.reduceDamage, measure.reduceProb);
            
            this.closeLinkMeasureRiskModal();
            this.showNotification(`✅ Риск "${risk.threat}" связан с мерой "${measure.name}"`, 'success');
        },

        unlinkMeasureFromRisk(riskId) {
            const risk = this.risks.find(r => r.id === riskId);
            if (!risk) return;
            
            const measureName = this.measures.find(m => m.id === risk.measureId)?.name || 'мера';
            
            risk.measureId = null;
            risk.reduceDamage = 0;
            risk.reduceProb = 0;
            risk.residualScore = null;
            
            this.showNotification(`✅ Мера отвязана от риска "${risk.threat}"`, 'success');
        },

        // ====================== МЕТОДЫ ОТЧЕТОВ ======================
        getAvailableRisksForLinking() {
            return this.risks.filter(r => !r.measureId).map(r => {
                const asset = this.assets.find(a => a.id === r.assetId);
                return {
                    id: r.id,
                    label: `${r.threat} (${asset ? asset.name : 'Актив ID:' + r.assetId}) - Риск: ${r.score}`
                };
            });
        },

        getAvailableRisksForMeasureLinking() {
            return this.risks.filter(r => !r.measureId).map(r => {
                const asset = this.assets.find(a => a.id === r.assetId);
                return {
                    id: r.id,
                    label: `${r.threat} (${asset ? asset.name : 'Актив ID:' + r.assetId}) - Риск: ${r.score}`
                };
            });
        },

        getRiskCountForAsset(assetId) {
            return this.risks.filter(r => r.assetId === assetId).length;
        },

        getRiskCategory(riskScore) {
            if (riskScore <= this.criteria.riskAppetite) return 'low';
            if (riskScore <= this.criteria.riskAppetite * 1.5) return 'medium';
            return 'high';
        },

        getRiskCategoryLabel(riskScore) {
            const category = this.getRiskCategory(riskScore);
            if (category === 'low') return '✅ Низкий';
            if (category === 'medium') return '⚠️ Средний';
            return '🔴 Высокий';
        },

        getEffectForMeasure(measure) {
            const linkedRisk = this.risks.find(r => r.measureId === measure.id);
            if (!linkedRisk) return null;
            
            const effect = this.calculateExpectedLoss(linkedRisk.score) - this.calculateExpectedLoss(linkedRisk.residualScore);
            const rosi = this.calculateNetROSI(effect, measure.cost);
            
            return { effect, rosi };
        },

        // ====================== ФОРМУЛЫ ======================
        calculateRisk(damage, probability, priority) {
            return damage * probability * priority;
        },

        calculateResidualRisk(risk, reduceDamage, reduceProb) {
            const newDamage = risk.damage * (1 - reduceDamage / 100);
            const newProb = risk.probability * (1 - reduceProb / 100);
            return Math.max(1, Math.round(newDamage * newProb * risk.priority));
        },

        calculateExpectedLoss(riskScore) {
            return riskScore * this.criteria.costPerPoint;
        },

        calculateROSI(effect, cost) {
            return cost > 0 ? Math.round((effect / cost) * 100) : 0;
        },

        calculateNetROSI(effect, cost) {
            // Net ROSI = ((lossBefore - lossAfter) - cost) / cost * 100%
            return cost > 0 ? Math.round(((effect - cost) / cost) * 100) : 0;
        },

        calculatePayback(cost, annualSaving) {
            return annualSaving > 0 ? (cost / annualSaving).toFixed(1) : "∞";
        },

        // ====================== ТАБ ДАШБОРД ======================
        get totalRiskBefore() {
            return this.risks.reduce((sum, r) => sum + r.score, 0);
        },

        get totalRiskAfter() {
            return this.risks.reduce((sum, r) => sum + (r.residualScore || r.score), 0);
        },

        get totalEffect() {
            return this.risks.reduce((sum, r) => {
                if (r.residualScore === null) return sum;
                const lossBefore = this.calculateExpectedLoss(r.score);
                const lossAfter = this.calculateExpectedLoss(r.residualScore);
                return sum + (lossBefore - lossAfter);
            }, 0);
        },

        get avgROI() {
            const rosis = this.risks.filter(r => r.residualScore !== null).map(r => {
                const effect = this.calculateExpectedLoss(r.score) - this.calculateExpectedLoss(r.residualScore);
                const cost = this.measures.find(m => m.id === r.measureId)?.cost || 100000;
                return this.calculateNetROSI(effect, cost);
            });
            return rosis.length ? Math.round(rosis.reduce((a,b)=>a+b,0)/rosis.length) : 0;
        },

        get lastRisks() {
            return this.risks.slice(0, 3);
        },

        // ====================== ТАБ ЭКОНОМИКА ======================
        get economicSummaryBefore() {
            return this.risks.reduce((s, r) => s + this.calculateExpectedLoss(r.score), 0);
        },

        get economicSummaryAfter() {
            return this.risks.reduce((s, r) => s + this.calculateExpectedLoss(r.residualScore || r.score), 0);
        },

        get economicTotalCost() {
            return this.measures.reduce((s, m) => s + m.cost, 0);
        },

        get economicTotalEffect() {
            return this.economicSummaryBefore - this.economicSummaryAfter - this.economicTotalCost;
        },

        // ====================== СБРОС ======================
        resetAll() {
            if (confirm('Сбросить ВСЕ данные?')) {
                this.assets = [];
                this.risks = [];
                this.measures = [];
                this.currentTab = 0;
                this.showNotification('✅ Данные очищены', 'success');
            }
        },

        // ====================== ИНИЦИАЛИЗАЦИЯ ======================
        init() {
            this.assets = [
                {id: 1, name: 'База ПДн', priority: 4, value: 2500000},
                {id: 2, name: 'Сервер 1С', priority: 3, value: 1200000}
            ];
            
            this.risks = [
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
            
            this.measures = [
                {id: 201, name: 'Многофакторная аутентификация', cost: 380000, reduceDamage: 30, reduceProb: 90}
            ];
        }
    }))
});
