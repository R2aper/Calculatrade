// ====================== ALPINE.JS КОМПОНЕНТ ======================
document.addEventListener('alpine:init', () => {
  Alpine.data(
      'app',
      () => ({
        currentTab: 0,
        criteria: {
          formula: 'damage * probability * priority',
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

        // ====================== АВТОРИЗАЦИЯ ======================
        isLoggedIn: false,
        currentUser: {login: ''},
        authModalOpen: false,
        authTab: 'login',
        authForm: {
          login: '',
          password: '',
        },
        dbInitialized: false,

        // ====================== ИНИЦИАЛИЗАЦИЯ ======================
        async init() {
          // Инициализируем базу данных
          this.dbInitialized = await db.init();

          if (!this.dbInitialized) {
            this.showNotification(
                '❌ Ошибка инициализации базы данных', 'error');
            return;
          }

          // Создаем demo аккаунт, если его нет
          const demoResult = db.registerUser('demo', 'demo');
          if (demoResult.success) {
            // Создаем данные для demo аккаунта
            const loginResult = db.loginUser('demo', 'demo');
            if (loginResult.success) {
              // Добавляем активы
              const asset1 =
                  db.addAsset({name: 'База ПДн', value: 2500000, priority: 4});
              const asset2 =
                  db.addAsset({name: 'Сервер 1С', value: 1200000, priority: 3});

              // Добавляем меры
              const measure1 = db.addMeasure({
                name: 'Многофакторная аутентификация',
                cost: 380000,
                reduceDamage: 30,
                reduceProb: 90
              });

              // Добавляем риски
              const risk1 = db.addRisk({
                threat: 'Несанкционированный доступ',
                vulnerability: 'Слабый пароль',
                assetId: asset1.id,
                damage: 4,
                probability: 3,
                priority: 4,
                score: 48
              });

              // Привязываем меру к риску
              db.updateRisk(risk1.id, {
                measure_id: measure1.id,
                reduceDamage: 30,
                reduceProb: 90,
                residualScore: 8
              });
              db.updateMeasure(measure1.id, {linkedRiskId: risk1.id});

              // Выходим из demo аккаунта
              db.logout();
            }
          }

          // Проверяем, есть ли активная сессия в localStorage
          const savedSession = localStorage.getItem('securityAppSession');
          if (savedSession) {
            const session = JSON.parse(savedSession);
            if (session.userId) {
              db.currentUserId = session.userId;
              this.isLoggedIn = true;
              this.currentUser = {login: session.login};
              this.loadData();
              this.showNotification(
                  `✅ Сессия восстановлена, ${this.currentUser.login}!`,
                  'success');
            }
          }
        },

        // ====================== ЗАГРУЗКА ДАННЫХ ======================
        loadData() {
          if (!db.isLoggedIn()) return;

          // Загружаем критерии
          const criteria = db.getCriteria();
          if (criteria) {
            this.criteria = criteria;
          }

          // Загружаем активы
          this.assets = db.getAssets();

          // Загружаем риски
          this.risks = db.getRisks();

          // Загружаем меры
          this.measures = db.getMeasures();

          console.log('✅ Данные загружены из БД');
        },

        // ====================== МЕТОДЫ АВТОРИЗАЦИИ ======================
        toggleAuthModal() {
          this.authModalOpen = !this.authModalOpen;
          if (this.authModalOpen) {
            this.authForm = {login: '', password: ''};
            this.authTab = 'login';
          }
        },

        switchAuthTab(tab) {
          this.authTab = tab;
          this.authForm = {login: '', password: ''};
        },

        submitLogin() {
          if (!this.authForm.login || !this.authForm.password) {
            this.showNotification('❌ Введите логин и пароль', 'error');
            return;
          }

          const result =
              db.loginUser(this.authForm.login, this.authForm.password);

          if (result.success) {
            this.currentUser = {
              name: result.login.split('@')[0] || 'Пользователь',
              login: result.login
            };
            this.isLoggedIn = true;
            this.authModalOpen = false;

            // Сохраняем сессию
            localStorage.setItem(
                'securityAppSession',
                JSON.stringify({userId: result.userId, login: result.login}));

            // Загружаем данные пользователя
            this.loadData();

            this.showNotification(
                `✅ Добро пожаловать, ${this.currentUser.name}!`, 'success');
          } else {
            this.showNotification(`❌ ${result.error}`, 'error');
          }
        },

        submitRegister() {
          if (!this.authForm.login || !this.authForm.password) {
            this.showNotification('❌ Заполните все поля', 'error');
            return;
          }
          if (this.authForm.password.length < 4) {
            this.showNotification(
                '❌ Пароль должен быть не менее 4 символов', 'error');
            return;
          }

          const result =
              db.registerUser(this.authForm.login, this.authForm.password);

          if (result.success) {
            this.currentUser = {login: this.authForm.login};
            this.isLoggedIn = true;
            this.authModalOpen = false;

            // Сохраняем сессию
            localStorage.setItem(
                'securityAppSession',
                JSON.stringify(
                    {userId: result.userId, login: this.authForm.login}));

            // Загружаем данные (критерии по умолчанию)
            this.loadData();

            this.showNotification(
                `✅ Профиль "${this.currentUser.login}" создан и выполнен вход`,
                'success');
          } else {
            this.showNotification(`❌ ${result.error}`, 'error');
          }
        },

        logout() {
          if (confirm('Выйти из аккаунта?')) {
            db.logout();
            this.isLoggedIn = false;
            this.currentUser = {login: ''};

            // Очищаем сессию
            localStorage.removeItem('securityAppSession');

            // Очищаем данные в интерфейсе
            this.assets = [];
            this.risks = [];
            this.measures = [];

            this.showNotification('👋 Вы вышли из аккаунта', 'info');
          }
        },

        // ====================== МОДАЛЬНЫЕ ОКНА ======================
        addAssetModalOpen: false,
        addRiskModalOpen: false,
        addMeasureModalOpen: false,

        // ====================== ФОРМЫ ======================
        assetForm: {name: '', value: '', priority: 3},
        riskForm: {
          threat: '',
          vulnerability: '',
          assetId: null,
          damage: 2,
          probability: 2
        },
        measureForm: {name: '', cost: '', reduceDamage: 40, reduceProb: 80},

        // ====================== УВЕДОМЛЕНИЯ ======================
        notification: {show: false, message: '', type: 'success'},
        notificationTimeout: null,

        // ====================== ТАБЫ ======================
        showTab(n) {
          this.currentTab = n;
        },

        // ====================== УВЕДОМЛЕНИЯ ======================
        showNotification(message, type = 'success', duration = 3000) {
          if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
          }

          this.notification.message = message;
          this.notification.type = type;
          this.notification.show = true;

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

        // ====================== КРИТЕРИИ ======================
        saveCriteria() {
          const saved = db.saveCriteria(this.criteria);
          if (saved) {
            this.showNotification('✅ Критерии сохранены!', 'success');
          } else {
            this.showNotification('❌ Ошибка сохранения критериев', 'error');
          }
        },

        // ====================== АКТИВЫ ======================
        openAddAssetModal() {
          this.assetForm = {name: '', value: '', priority: 3};
          this.addAssetModalOpen = true;
        },

        closeAddAssetModal() {
          this.addAssetModalOpen = false;
          this.assetForm = {name: '', value: '', priority: 3};
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
            this.showNotification(
                '❌ Приоритет должен быть от 1 до 4', 'error');
            return;
          }

          const asset = db.addAsset({
            name: this.assetForm.name,
            value: parseInt(this.assetForm.value),
            priority: parseInt(this.assetForm.priority)
          });

          if (asset) {
            this.assets.push(asset);
            this.closeAddAssetModal();
            this.showNotification(
                `✅ Актив "${this.assetForm.name}" добавлен`, 'success');
          }
        },

        updateAssetPriority(assetId, newPriority) {
          if (newPriority < 1 || newPriority > 4) {
            console.error('Приоритет должен быть от 1 до 4');
            return;
          }

          const asset = this.assets.find(a => a.id === assetId);
          if (!asset) return;

          db.updateAsset(assetId, {priority: newPriority});
          asset.priority = newPriority;

          const linkedRisks = this.risks.filter(r => r.assetId === assetId);
          linkedRisks.forEach(r => {
            r.priority = newPriority;
            r.score = this.calculateRisk(r.damage, r.probability, r.priority);

            if (r.residualScore !== null) {
              r.residualScore =
                  this.calculateResidualRisk(r, r.reduceDamage, r.reduceProb);
            }
            db.updateRisk(r.id, {
              priority: r.priority,
              score: r.score,
              residualScore: r.residualScore
            });
          });

          this.showNotification(
              `✅ Приоритет актива "${asset.name}" обновлён`, 'success');
        },

        deleteAsset(id) {
          const asset = this.assets.find(a => a.id === id);
          const linkedRisks = this.risks.filter(r => r.assetId === id);

          if (linkedRisks.length > 0) {
            const confirm_delete = confirm(`Актив "${asset.name}" имеет ${
                linkedRisks.length} риск(ов). 
                     Они будут удалены. Продолжить?`);
            if (!confirm_delete) return;
          }

          db.deleteAsset(id);
          this.assets = this.assets.filter(a => a.id !== id);
          this.risks = this.risks.filter(r => r.assetId !== id);

          this.showNotification('✅ Актив удалён', 'success');
        },

        // ====================== РИСКИ ======================
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
          this.riskForm = {
            threat: '',
            vulnerability: '',
            assetId: null,
            damage: 2,
            probability: 2
          };
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

          const score = this.calculateRisk(
              this.riskForm.damage, this.riskForm.probability, asset.priority);

          const risk = db.addRisk({
            threat: this.riskForm.threat,
            vulnerability: this.riskForm.vulnerability,
            assetId: asset.id,
            damage: parseInt(this.riskForm.damage),
            probability: parseInt(this.riskForm.probability),
            priority: asset.priority,
            score: score,
            residualScore: null,
            measureId: null,
            reduceDamage: 0,
            reduceProb: 0
          });

          if (risk) {
            this.risks.push(risk);
            this.closeAddRiskModal();
            this.showNotification(
                `✅ Риск добавлен к активу "${asset.name}"`, 'success');
          }
        },

        deleteRisk(id) {
          db.deleteRisk(id);
          this.risks = this.risks.filter(r => r.id !== id);
          this.showNotification('✅ Риск удалён', 'success');
        },

        // ====================== МЕРЫ ======================
        openAddMeasureModal() {
          this.measureForm =
              {name: '', cost: '', reduceDamage: 40, reduceProb: 80};
          this.addMeasureModalOpen = true;
        },

        closeAddMeasureModal() {
          this.addMeasureModalOpen = false;
          this.measureForm =
              {name: '', cost: '', reduceDamage: 40, reduceProb: 80};
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
          if (this.measureForm.reduceDamage < 0 ||
              this.measureForm.reduceDamage > 100) {
            this.showNotification(
                '❌ Снижение ущерба должно быть 0-100%', 'error');
            return;
          }
          if (this.measureForm.reduceProb < 0 ||
              this.measureForm.reduceProb > 100) {
            this.showNotification(
                '❌ Снижение вероятности должно быть 0-100%', 'error');
            return;
          }

          const measure = db.addMeasure({
            name: this.measureForm.name,
            cost: parseInt(this.measureForm.cost),
            reduceDamage: parseInt(this.measureForm.reduceDamage),
            reduceProb: parseInt(this.measureForm.reduceProb)
          });

          if (measure) {
            this.measures.push(measure);
            this.closeAddMeasureModal();
            this.showNotification(
                `✅ Защитная мера "${this.measureForm.name}" добавлена`,
                'success');
          }
        },

        deleteMeasure(id) {
          db.deleteMeasure(id);
          this.measures = this.measures.filter(m => m.id !== id);
          this.risks.forEach(r => {
            if (r.measureId === id) {
              r.measureId = null;
              r.reduceDamage = 0;
              r.reduceProb = 0;
              r.residualScore = null;
              db.updateRisk(r.id, {
                measure_id: null,
                reduceDamage: 0,
                reduceProb: 0,
                residualScore: null
              });
            }
          });
          this.showNotification('✅ Мера удалена', 'success');
        },

        // ====================== ПРИВЯЗКА МЕР ======================
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

          const measure =
              this.measures.find(m => m.id === this.currentMeasureIdForLinking);
          if (!measure) {
            this.showNotification('❌ Мера не найдена', 'error');
            return;
          }

          risk.measureId = this.currentMeasureIdForLinking;
          risk.reduceDamage = measure.reduceDamage;
          risk.reduceProb = measure.reduceProb;
          risk.residualScore = this.calculateResidualRisk(
              risk, measure.reduceDamage, measure.reduceProb);

          db.updateRisk(risk.id, {
            measure_id: risk.measureId,
            reduceDamage: risk.reduceDamage,
            reduceProb: risk.reduceProb,
            residualScore: risk.residualScore
          });

          db.updateMeasure(measure.id, {linkedRiskId: risk.id});

          this.closeLinkMeasureModal();
          this.showNotification(
              `✅ Мера привязана к риску "${risk.threat}"`, 'success');
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

          const measure =
              this.measures.find(m => m.id === this.currentMeasureIdForLinking);
          if (!measure) {
            this.showNotification('❌ Мера не найдена', 'error');
            return;
          }

          if (risk.measureId) {
            this.showNotification(
                '⚠️ К этому риску уже привязана мера', 'error');
            return;
          }

          risk.measureId = this.currentMeasureIdForLinking;
          risk.reduceDamage = measure.reduceDamage;
          risk.reduceProb = measure.reduceProb;
          risk.residualScore = this.calculateResidualRisk(
              risk, measure.reduceDamage, measure.reduceProb);

          db.updateRisk(risk.id, {
            measure_id: risk.measureId,
            reduceDamage: risk.reduceDamage,
            reduceProb: risk.reduceProb,
            residualScore: risk.residualScore
          });

          db.updateMeasure(measure.id, {linkedRiskId: risk.id});

          this.closeLinkMeasureRiskModal();
          this.showNotification(
              `✅ Риск "${risk.threat}" связан с мерой "${measure.name}"`,
              'success');
        },

        unlinkMeasureFromRisk(riskId) {
          const risk = this.risks.find(r => r.id === riskId);
          if (!risk) return;

          const measure = this.measures.find(m => m.id === risk.measureId);
          if (measure) {
            db.updateMeasure(measure.id, {linkedRiskId: null});
          }

          risk.measureId = null;
          risk.reduceDamage = 0;
          risk.reduceProb = 0;
          risk.residualScore = null;

          db.updateRisk(risk.id, {
            measure_id: null,
            reduceDamage: 0,
            reduceProb: 0,
            residualScore: null
          });

          this.showNotification(
              `✅ Мера отвязана от риска "${risk.threat}"`, 'success');
        },

        // ====================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ======================
        getAvailableRisksForLinking() {
          return this.risks.filter(r => !r.measureId).map(r => {
            const asset = this.assets.find(a => a.id === r.assetId);
            return {
              id: r.id,
              label: `${r.threat} (${
                  asset ? asset.name :
                          'Актив ID:' + r.assetId}) - Риск: ${r.score}`
            };
          });
        },

        getAvailableRisksForMeasureLinking() {
          return this.risks.filter(r => !r.measureId).map(r => {
            const asset = this.assets.find(a => a.id === r.assetId);
            return {
              id: r.id,
              label: `${r.threat} (${
                  asset ? asset.name :
                          'Актив ID:' + r.assetId}) - Риск: ${r.score}`
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

          const effect = this.calculateExpectedLoss(linkedRisk.score) -
              this.calculateExpectedLoss(linkedRisk.residualScore);
          const rosi = this.calculateNetROSI(effect, measure.cost);

          return {effect, rosi};
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
          return cost > 0 ? Math.round(((effect - cost) / cost) * 100) : 0;
        },

        calculatePayback(cost, annualSaving) {
          return annualSaving > 0 ? (cost / annualSaving).toFixed(1) : '∞';
        },

        // ====================== ДАШБОРД ======================
        get totalRiskBefore() {
          return this.risks.reduce((sum, r) => sum + r.score, 0);
        },

        get totalRiskAfter() {
          return this.risks.reduce(
              (sum, r) => sum + (r.residualScore || r.score), 0);
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
          const rosis =
              this.risks.filter(r => r.residualScore !== null).map(r => {
                const effect = this.calculateExpectedLoss(r.score) -
                    this.calculateExpectedLoss(r.residualScore);
                const cost =
                    this.measures.find(m => m.id === r.measureId)?.cost ||
                    100000;
                return this.calculateNetROSI(effect, cost);
              });
          return rosis.length ?
              Math.round(rosis.reduce((a, b) => a + b, 0) / rosis.length) :
              0;
        },

        get lastRisks() {
          return this.risks.slice(0, 3);
        },

        // ====================== ЭКОНОМИКА ======================
        get economicSummaryBefore() {
          return this.risks.reduce(
              (s, r) => s + this.calculateExpectedLoss(r.score), 0);
        },

        get economicSummaryAfter() {
          return this.risks.reduce(
              (s, r) =>
                  s + this.calculateExpectedLoss(r.residualScore || r.score),
              0);
        },

        get economicTotalCost() {
          return this.measures.reduce((s, m) => s + m.cost, 0);
        },

        get economicTotalEffect() {
          return this.economicSummaryBefore - this.economicSummaryAfter -
              this.economicTotalCost;
        },

        // ====================== СБРОС ======================
        resetAll() {
          if (confirm('Сбросить ВСЕ данные текущего пользователя?')) {
            db.resetUserData();

            // Очищаем данные в интерфейсе
            this.assets = [];
            this.risks = [];
            this.measures = [];

            // Сбрасываем критерии к значениям по умолчанию
            this.criteria = {
              formula: 'damage * probability * priority',
              damageMax: 4,
              probMax: 4,
              priorityMax: 4,
              riskAppetite: 12,
              costPerPoint: 50000
            };

            this.currentTab = 0;
            this.showNotification('✅ Данные пользователя очищены', 'success');
          }
        }
      }));
});