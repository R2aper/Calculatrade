// ====================== ALPINE.JS КОМПОНЕНТ ======================
function registerApp() {
  const factory = () => ({
    currentTab: 0,
    criteria: {
      formula: 'Урон ⋅ Вероятность ⋅ Приоритет',
      damageMax: 4,
      probMax: 4,
      priorityMax: 4,
      riskAppetite: 12,
      costPerPoint: 50000
    },
    assets: [],
    risks: [],
    measures: [],
    riskSearch: '',
    riskFilter: 'all',
    selectedRiskId: null,
    riskSort: 'score-desc',
    currentMeasureIdForLinking: null,
    linkMeasureModalOpen: false,
    linkMeasureRiskModalOpen: false,
    selectedMeasureIdForLinking: '',
    selectedRiskIdForLinking: '',
    isLoading: false,

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

          // Проверяем, есть ли активная сессия в localStorage
          const savedSession = localStorage.getItem('securityAppSession');
          if (savedSession) {
            try {
              const session = JSON.parse(savedSession);
              if (session.userId) {
              db.currentUserId = session.userId;
              this.isLoggedIn = true;
              this.currentUser = {login: session.login};
              await this.loadData();
                this.showNotification(
                    `✅ Сессия восстановлена, ${this.currentUser.login}!`,
                    'success');
              }
            } catch (error) {
              console.warn('⚠️ Session parse failed', error);
              db.clearSession();
            }
          }
        },

        // ====================== ЗАГРУЗКА ДАННЫХ ======================
        async loadData() {
          if (!db.isLoggedIn()) return;

          // Загружаем критерии
          const criteria = await db.getCriteria();
          if (criteria) {
            this.criteria = criteria;
          }

          // Загружаем активы
          this.assets = await db.getAssets();

          // Загружаем риски
          this.risks = await db.getRisks();

          // Загружаем меры
          this.measures = await db.getMeasures();

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

        async submitLogin() {
          if (!this.authForm.login || !this.authForm.password) {
            this.showNotification('❌ Введите логин и пароль', 'error');
            return;
          }

          const result =
              await db.loginUser(this.authForm.login, this.authForm.password);

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
            await this.loadData();

            this.showNotification(
                `✅ Добро пожаловать, ${this.currentUser.name}!`, 'success');
          } else {
            this.showNotification(`❌ ${result.error}`, 'error');
          }
        },

        async submitRegister() {
          if (!this.authForm.login || !this.authForm.password) {
            this.showNotification('❌ Заполните все поля', 'error');
            return;
          }
          if (this.authForm.password.length < 6) {
            this.showNotification(
                '❌ Пароль должен быть не менее 6 символов', 'error');
            return;
          }

          const result =
              await db.registerUser(this.authForm.login, this.authForm.password);

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
            await this.loadData();

            this.showNotification(
                `✅ Профиль "${this.currentUser.login}" создан и выполнен вход`,
                'success');
          } else {
            this.showNotification(`❌ ${result.error}`, 'error');
          }
        },

        async logout() {
          if (confirm('Выйти из аккаунта?')) {
            await db.logout();
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
        async saveCriteria() {
          if (!this.isLoggedIn) {
            this.showNotification('⚠️ Для сохранения критериев необходимо войти в аккаунт', 'warning');
            this.authModalOpen = true;
            return;
          }
          try {
            const saved = await db.saveCriteria(this.criteria);
            if (saved) {
              this.showNotification('✅ Критерии сохранены!', 'success');
            } else {
              this.showNotification('❌ Ошибка сохранения критериев', 'error');
            }
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
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

        async submitAsset() {
          if (!this.isLoggedIn) {
            this.showNotification('⚠️ Для создания актива необходимо войти в аккаунт', 'warning');
            this.authModalOpen = true;
            return;
          }
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

          try {
            const asset = await db.addAsset({
              name: this.assetForm.name.trim(),
              value: Number(this.assetForm.value),
              priority: Number(this.assetForm.priority)
            });

            if (asset) {
              this.assets.push(asset);
              this.closeAddAssetModal();
              this.showNotification(`✅ Актив "${this.assetForm.name}" добавлен`, 'success');
            }
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        async updateAssetPriority(assetId, newPriority) {
          if (newPriority < 1 || newPriority > 4) {
            console.error('Приоритет должен быть от 1 до 4');
            return;
          }

          const asset = this.assets.find(a => a.id === assetId);
          if (!asset) return;

          try {
            await db.updateAsset(assetId, {priority: newPriority});
            asset.priority = newPriority;

            const linkedRisks = this.risks.filter(r => r.assetId === assetId);
            for (const r of linkedRisks) {
              r.priority = newPriority;
              r.score = this.calculateRisk(r.damage, r.probability, r.priority);

              if (r.residualScore !== null) {
                r.residualScore = this.calculateResidualRisk(r, r.reduceDamage, r.reduceProb);
              }
              await db.updateRisk(r.id, {
                priority: r.priority,
                score: r.score,
                residualScore: r.residualScore
              });
            }

            this.showNotification(`✅ Приоритет актива "${asset.name}" обновлён`, 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        async updateAsset(assetId, updates) {
          const asset = this.assets.find(a => a.id === assetId);
          if (!asset) return;

          try {
            Object.assign(asset, updates);
            await db.updateAsset(assetId, updates);
            this.showNotification('✅ Актив обновлен', 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        async deleteAsset(id) {
          const asset = this.assets.find(a => a.id === id);
          if (!asset) return;
          const linkedRisks = this.risks.filter(r => r.assetId === id);

          if (linkedRisks.length > 0) {
            const confirm_delete = confirm(`Актив "${asset.name}" имеет ${linkedRisks.length} риск(ов). Они будут удалены. Продолжить?`);
            if (!confirm_delete) return;
          }

          try {
            await db.deleteAsset(id);
            const deletedRiskIds = linkedRisks.map(r => r.id);
            this.assets = this.assets.filter(a => a.id !== id);
            this.risks = this.risks.filter(r => r.assetId !== id);
            for (const m of this.measures) {
              if (deletedRiskIds.includes(m.linkedRiskId)) {
                m.linkedRiskId = null;
              }
            }
            if (deletedRiskIds.includes(this.selectedRiskId)) {
              this.selectedRiskId = null;
            }
            this.showNotification('✅ Актив удалён', 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        // ====================== РИСКИ ======================
        openAddRiskModal() {
          if (this.assets.length === 0) {
            this.showNotification(' Сначала создайте актив!', 'error');
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

        async submitRisk() {
          if (!this.isLoggedIn) {
            this.showNotification('⚠️ Для добавления риска необходимо войти в аккаунт', 'warning');
            this.authModalOpen = true;
            return;
          }
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

          try {
            const risk = await db.addRisk({
              threat: this.riskForm.threat.trim(),
              vulnerability: this.riskForm.vulnerability.trim(),
              assetId: asset.id,
              damage: Number(this.riskForm.damage),
              probability: Number(this.riskForm.probability),
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
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        async updateRiskField(riskId, field, value) {
          const risk = this.risks.find(r => r.id === riskId);
          if (!risk) return;

          const updates = {[field]: value};
          await db.updateRisk(riskId, updates);
          this.showNotification('Риск обновлен', 'success');
        },

        async recalculateRiskScore(risk) {
          // Пересчитываем исходный риск после изменения damage/probability
          const asset = this.assets.find(a => a.id === risk.assetId);
          if (!asset) return;

          risk.score =
              this.calculateRisk(risk.damage, risk.probability, asset.priority);

          // Если есть привязанная мера, пересчитываем остаточный риск
          if (risk.measureId) {
            const measure = this.measures.find(m => m.id === risk.measureId);
            if (measure) {
              risk.residualScore = this.calculateResidualRisk(
                  risk, measure.reduceDamage, measure.reduceProb);
            }
          }

          await db.updateRisk(risk.id, {
            damage: risk.damage,
            probability: risk.probability,
            score: risk.score,
            residualScore: risk.residualScore
          });

          this.showNotification('Параметры риска обновлены', 'success');
        },

        get filteredRisks() {
          let result = [...this.risks];
          const q = this.riskSearch.trim().toLowerCase();

          if (q) {
            result = result.filter(r => {
              const asset = this.assets.find(a => a.id === r.assetId);
              const text = `${r.threat || ''} ${r.vulnerability || ''} ${asset?.name || ''}`.toLowerCase();
              return text.includes(q);
            });
          }

          if (this.riskFilter !== 'all') {
            result = result.filter(r => this.getRiskCategory(r.score) === this.riskFilter);
          }

          result.sort((a, b) => {
            if (this.riskSort === 'score-asc') return a.score - b.score;
            if (this.riskSort === 'name') return (a.threat || '').localeCompare(b.threat || '', 'ru');
            return b.score - a.score;
          });
          return result;
        },

        get selectedRisk() {
          return this.risks.find(r => r.id === this.selectedRiskId) || null;
        },

        get riskStats() {
          return {
            total: this.risks.length,
            high: this.risks.filter(r => this.getRiskCategory(r.score) === 'high').length,
            medium: this.risks.filter(r => this.getRiskCategory(r.score) === 'medium').length,
            controlled: this.risks.filter(r => r.residualScore !== null && r.residualScore !== undefined).length
          };
        },

        selectRisk(id) {
          this.selectedRiskId = id;
        },

        getRiskAsset(risk) {
          return this.assets.find(a => a.id === risk.assetId) || null;
        },

        getRiskMeasure(risk) {
          return this.measures.find(m => m.id === risk.measureId) || null;
        },

        async deleteRisk(id) {
          const risk = this.risks.find(r => r.id === id);
          if (!risk) return;
          if (!confirm(`Удалить риск «${risk.threat}»?`)) return;
          try {
            await db.deleteRisk(id);
            this.risks = this.risks.filter(r => r.id !== id);
            for (const m of this.measures) {
              if (m.linkedRiskId === id) {
                m.linkedRiskId = null;
              }
            }
            if (this.selectedRiskId === id) this.selectedRiskId = null;
            this.showNotification('✅ Риск удалён', 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
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

        async submitMeasure() {
          if (!this.isLoggedIn) {
            this.showNotification('⚠️ Для создания меры необходимо войти в аккаунт', 'warning');
            this.authModalOpen = true;
            return;
          }
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

          try {
            const measure = await db.addMeasure({
              name: this.measureForm.name.trim(),
              cost: Number(this.measureForm.cost),
              reduceDamage: Number(this.measureForm.reduceDamage),
              reduceProb: Number(this.measureForm.reduceProb)
            });

            if (measure) {
              this.measures.push(measure);
              this.closeAddMeasureModal();
              this.showNotification(`✅ Защитная мера "${this.measureForm.name}" добавлена`, 'success');
            }
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        async updateMeasureField(measureId, field, value) {
          const measure = this.measures.find(m => m.id === measureId);
          if (!measure) return;

          try {
            Object.assign(measure, {[field]: value});
            await db.updateMeasure(measureId, {[field]: value});

            // Если изменились параметры снижения, пересчитываем остаточный риск для привязанного риска
            if ((field === 'reduceDamage' || field === 'reduceProb') && measure.linkedRiskId) {
              const risk = this.risks.find(r => r.id === measure.linkedRiskId);
              if (risk) {
                risk.reduceDamage = measure.reduceDamage;
                risk.reduceProb = measure.reduceProb;
                risk.residualScore = this.calculateResidualRisk(
                    risk, measure.reduceDamage, measure.reduceProb);

                await db.updateRisk(risk.id, {
                  reduceDamage: risk.reduceDamage,
                  reduceProb: risk.reduceProb,
                  residualScore: risk.residualScore
                });
              }
            }

            this.showNotification('✅ Мера обновлена', 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        async deleteMeasure(id) {
          try {
            await db.deleteMeasure(id);
            this.measures = this.measures.filter(m => m.id !== id);
            for (const r of this.risks) {
              if (r.measureId === id) {
                r.measureId = null;
                r.reduceDamage = 0;
                r.reduceProb = 0;
                r.residualScore = null;
                await db.updateRisk(r.id, {
                  measureId: null,
                  reduceDamage: 0,
                  reduceProb: 0,
                  residualScore: null
                });
              }
            }
            this.showNotification('✅ Мера удалена', 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        // ====================== ПРИВЯЗКА МЕР (ИЗ ТАБА РИСКОВ) ======================
        openLinkMeasureModal(riskId) {
          this.selectedRiskId = riskId;
          const risk = this.risks.find(r => r.id === riskId);
          this.selectedMeasureIdForLinking = risk?.measureId || '';
          this.linkMeasureModalOpen = true;
        },

        closeLinkMeasureModal() {
          this.linkMeasureModalOpen = false;
          this.selectedMeasureIdForLinking = '';
        },

        getAvailableMeasuresForLinking() {
          return this.measures.map(m => {
            const isBoundToOther = m.linkedRiskId && m.linkedRiskId !== this.selectedRiskId;
            const otherRisk = isBoundToOther ? this.risks.find(r => r.id === m.linkedRiskId) : null;
            const extra = otherRisk ? ` [привязана к: ${otherRisk.threat}]` : '';
            return {
              id: m.id,
              label: `${m.name} (-${m.reduceDamage}% ущерб, -${m.reduceProb}% вер., ${Number(m.cost).toLocaleString('ru')} ₽)${extra}`
            };
          });
        },

        async confirmLinkMeasureToRisk() {
          const risk = this.risks.find(r => r.id === this.selectedRiskId);
          if (!risk) {
            this.showNotification('❌ Риск не найден', 'error');
            return;
          }

          if (!this.selectedMeasureIdForLinking) {
            this.showNotification('❌ Выберите защитную меру', 'error');
            return;
          }

          const measure = this.measures.find(m => m.id === this.selectedMeasureIdForLinking);
          if (!measure) {
            this.showNotification('❌ Мера не найдена', 'error');
            return;
          }

          try {
            // Если мера была привязана к другому риску — отвязываем старый риск
            if (measure.linkedRiskId && measure.linkedRiskId !== risk.id) {
              const oldRisk = this.risks.find(r => r.id === measure.linkedRiskId);
              if (oldRisk) {
                oldRisk.measureId = null;
                oldRisk.reduceDamage = 0;
                oldRisk.reduceProb = 0;
                oldRisk.residualScore = null;
                await db.updateRisk(oldRisk.id, {
                  measureId: null,
                  reduceDamage: 0,
                  reduceProb: 0,
                  residualScore: null
                });
              }
            }

            // Если у этого риска уже была другая мера — отвязываем старую меру
            if (risk.measureId && risk.measureId !== measure.id) {
              const oldMeasure = this.measures.find(m => m.id === risk.measureId);
              if (oldMeasure) {
                oldMeasure.linkedRiskId = null;
                await db.updateMeasure(oldMeasure.id, {linkedRiskId: null});
              }
            }

            risk.measureId = measure.id;
            risk.reduceDamage = measure.reduceDamage;
            risk.reduceProb = measure.reduceProb;
            risk.residualScore = this.calculateResidualRisk(risk, measure.reduceDamage, measure.reduceProb);
            measure.linkedRiskId = risk.id;

            await db.updateRisk(risk.id, {
              measureId: risk.measureId,
              reduceDamage: risk.reduceDamage,
              reduceProb: risk.reduceProb,
              residualScore: risk.residualScore
            });

            await db.updateMeasure(measure.id, {linkedRiskId: risk.id});

            this.closeLinkMeasureModal();
            this.showNotification(`✅ Мера "${measure.name}" привязана к риску "${risk.threat}"`, 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        // ====================== ПРИВЯЗКА РИСКА (ИЗ ТАБА МЕР) ======================
        openLinkMeasureRiskModal(measureId) {
          this.currentMeasureIdForLinking = measureId;
          const measure = this.measures.find(m => m.id === measureId);
          this.selectedRiskIdForLinking = measure?.linkedRiskId || '';
          this.linkMeasureRiskModalOpen = true;
        },

        closeLinkMeasureRiskModal() {
          this.linkMeasureRiskModalOpen = false;
          this.currentMeasureIdForLinking = null;
          this.selectedRiskIdForLinking = '';
        },

        async confirmLinkMeasureRisk() {
          const riskId = this.selectedRiskIdForLinking;
          if (!riskId) {
            this.showNotification('❌ Выберите риск!', 'error');
            return;
          }

          const risk = this.risks.find(r => r.id === riskId);
          if (!risk) {
            this.showNotification('❌ Риск не найден', 'error');
            return;
          }

          const measure = this.measures.find(m => m.id === this.currentMeasureIdForLinking);
          if (!measure) {
            this.showNotification('❌ Мера не найдена', 'error');
            return;
          }

          try {
            // Если выбранный риск уже привязан к другой мере - отвязать старую меру
            if (risk.measureId && risk.measureId !== measure.id) {
              const oldMeasure = this.measures.find(m => m.id === risk.measureId);
              if (oldMeasure) {
                oldMeasure.linkedRiskId = null;
                await db.updateMeasure(oldMeasure.id, {linkedRiskId: null});
              }
            }

            // Если эта мера уже привязана к другому риску - отвязать старый риск
            if (measure.linkedRiskId && measure.linkedRiskId !== risk.id) {
              const oldRisk = this.risks.find(r => r.id === measure.linkedRiskId);
              if (oldRisk) {
                oldRisk.measureId = null;
                oldRisk.reduceDamage = 0;
                oldRisk.reduceProb = 0;
                oldRisk.residualScore = null;
                await db.updateRisk(oldRisk.id, {
                  measureId: null,
                  reduceDamage: 0,
                  reduceProb: 0,
                  residualScore: null
                });
              }
            }

            risk.measureId = this.currentMeasureIdForLinking;
            risk.reduceDamage = measure.reduceDamage;
            risk.reduceProb = measure.reduceProb;
            risk.residualScore = this.calculateResidualRisk(risk, measure.reduceDamage, measure.reduceProb);
            measure.linkedRiskId = risk.id;

            await db.updateRisk(risk.id, {
              measureId: risk.measureId,
              reduceDamage: risk.reduceDamage,
              reduceProb: risk.reduceProb,
              residualScore: risk.residualScore
            });

            await db.updateMeasure(measure.id, {linkedRiskId: risk.id});

            this.closeLinkMeasureRiskModal();
            this.showNotification(`✅ Мера "${measure.name}" привязана к риску "${risk.threat}"`, 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
        },

        async unlinkMeasureFromRisk(riskId) {
          const risk = this.risks.find(r => r.id === riskId);
          if (!risk) return;

          try {
            const measure = this.measures.find(m => m.id === risk.measureId || m.linkedRiskId === risk.id);
            if (measure) {
              measure.linkedRiskId = null;
              await db.updateMeasure(measure.id, {linkedRiskId: null});
            }

            risk.measureId = null;
            risk.reduceDamage = 0;
            risk.reduceProb = 0;
            risk.residualScore = null;

            await db.updateRisk(risk.id, {
              measureId: null,
              reduceDamage: 0,
              reduceProb: 0,
              residualScore: null
            });

            this.showNotification(`✅ Мера отвязана от риска "${risk.threat}"`, 'success');
          } catch (err) {
            this.showNotification(`❌ ${err.message}`, 'error');
          }
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
          return this.risks.map(r => {
            const asset = this.assets.find(a => a.id === r.assetId);
            const isBound =
                r.measureId && r.measureId !== this.currentMeasureIdForLinking;
            const label = `${r.threat} (${
                asset ? asset.name : 'Актив ID:' + r.assetId}) - Риск: ${
                r.score}${isBound ? ' [есть другая мера]' : ''}`;
            return {id: r.id, label};
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
          const linkedRisk = this.risks.find(r => r.measureId === measure.id || r.id === measure.linkedRiskId);
          if (!linkedRisk) return null;

          const residual = linkedRisk.residualScore != null
            ? linkedRisk.residualScore
            : this.calculateResidualRisk(linkedRisk, measure.reduceDamage, measure.reduceProb);

          const effect = this.calculateExpectedLoss(linkedRisk.score) -
              this.calculateExpectedLoss(residual);
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
          return (Number(riskScore) || 0) * (Number(this.criteria?.costPerPoint) || 50000);
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
          return this.risks.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
        },

        get totalRiskAfter() {
          return this.risks.reduce(
              (sum, r) => sum + (r.residualScore != null ? Number(r.residualScore) : (Number(r.score) || 0)), 0);
        },

        get totalEffect() {
          return this.risks.reduce((sum, r) => {
            if (r.residualScore === null || r.residualScore === undefined) return sum;
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
                const measure = this.measures.find(m => m.id === r.measureId || m.linkedRiskId === r.id);
                const cost = measure ? Number(measure.cost) : 0;
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
                  s + this.calculateExpectedLoss(r.residualScore != null ? r.residualScore : r.score),
              0);
        },

        get economicTotalCost() {
          return this.measures.reduce((s, m) => s + (Number(m.cost) || 0), 0);
        },

        get economicTotalEffect() {
          return (this.economicSummaryBefore - this.economicSummaryAfter) -
              this.economicTotalCost;
        },

        // ====================== СБРОС ======================
        async resetAll() {
          if (confirm('Сбросить ВСЕ данные текущего пользователя?')) {
            await db.resetUserData();

            // Очищаем данные в интерфейсе
            this.assets = [];
            this.risks = [];
            this.measures = [];

            // Сбрасываем критерии к значениям по умолчанию
            this.criteria = {
              formula: 'Урон ⋅ Вероятность ⋅ Приоритет',
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
  });

  if (typeof Alpine !== 'undefined') {
    Alpine.data('app', factory);
  } else if (typeof window !== 'undefined' && window.Alpine) {
    window.Alpine.data('app', factory);
  }
}

if (typeof window !== 'undefined' && window.Alpine) {
  registerApp();
} else if (typeof document !== 'undefined') {
  document.addEventListener('alpine:init', registerApp);
}