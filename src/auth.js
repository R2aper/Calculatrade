/*
 Авторизация
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.auth = {
  async init() {
    this.dbInitialized = await db.init();
    if (!this.dbInitialized) {
      this.showNotification('❌ Ошибка инициализации базы данных', 'error');
      return;
    }

    const demoResult = await db.registerUser('demo', 'demo');
    if (demoResult.success) {
      const loginResult = await db.loginUser('demo', 'demo');
      if (loginResult.success) {
        const asset1 =
            db.addAsset({name: 'База ПДн', value: 2500000, priority: 4});
        const asset2 =
            db.addAsset({name: 'Сервер 1С', value: 1200000, priority: 3});
        const measure1 = db.addMeasure({
          name: 'Многофакторная аутентификация',
          cost: 380000,
          reduceDamage: 30,
          reduceProb: 90
        });
        const risk1 = db.addRisk({
          threat: 'Несанкционированный доступ',
          vulnerability: 'Слабый пароль',
          assetId: asset1.id,
          damage: 4,
          probability: 3,
          priority: 4,
          score: 48
        });
        db.updateRisk(risk1.id, {
          measure_id: measure1.id,
          reduceDamage: 30,
          reduceProb: 90,
          residualScore: 8
        });
        db.updateMeasure(measure1.id, {linkedRiskId: risk1.id});
        db.logout();
      }
    }

    const savedSession = localStorage.getItem('securityAppSession');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      if (session.userId) {
        db.currentUserId = session.userId;
        this.isLoggedIn = true;
        this.currentUser = {login: session.login};
        this.loadData();
        this.showNotification(
            `✅ Сессия восстановлена, ${this.currentUser.login}!`, 'success');
      }
    }
  },

  loadData() {
    if (!db.isLoggedIn()) return;
    const criteria = db.getCriteria();
    if (criteria) this.criteria = criteria;
    this.assets = db.getAssets();
    this.risks = db.getRisks();
    this.measures = db.getMeasures();
    console.log('✅ Данные загружены из БД');
  },

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
      localStorage.setItem(
          'securityAppSession',
          JSON.stringify({userId: result.userId, login: result.login}));
      this.loadData();
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
    if (this.authForm.password.length < 4) {
      this.showNotification(
          '❌ Пароль должен быть не менее 4 символов', 'error');
      return;
    }
    const result =
        await db.registerUser(this.authForm.login, this.authForm.password);
    if (result.success) {
      this.currentUser = {login: this.authForm.login};
      this.isLoggedIn = true;
      this.authModalOpen = false;
      localStorage.setItem(
          'securityAppSession',
          JSON.stringify({userId: result.userId, login: this.authForm.login}));
      this.loadData();
      this.showNotification(
          `✅ Профиль "${this.currentUser.login}" создан и выполнен вход`,
          'success');
    } else {
      this.showNotification(`❌ ${result.error}`, 'error');
    }
  },

  logout() {
    if (!confirm('Выйти из аккаунта?')) return;
    db.logout();
    this.isLoggedIn = false;
    this.currentUser = {login: ''};
    localStorage.removeItem('securityAppSession');
    this.assets = [];
    this.risks = [];
    this.measures = [];
    this.showNotification('👋 Вы вышли из аккаунта', 'info');
  }
};
