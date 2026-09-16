/*
 Авторизация
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.auth = {
  async init() {
    this.dbInitialized = await db.init();
    if (!this.dbInitialized) {
      this.showNotification('❌ Ошибка инициализации API', 'error');
      return;
    }

    const savedSession = localStorage.getItem('securityAppSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.userId) {
          db.currentUserId = session.userId;
          this.isLoggedIn = true;
          this.currentUser = {login: session.login || ''};
          await this.loadData();
          this.showNotification(
              `✅ Сессия восстановлена, ${this.currentUser.login}!`, 'success');
        }
      } catch (error) {
        console.warn('⚠️ Session parse failed', error);
      }
    }

    if (!this.isLoggedIn) {
      await this.loadData();
    }
  },

  async loadData() {
    if (!db.isLoggedIn()) {
      this.criteria = {
        formula: 'Урон ⋅ Вероятность ⋅ Приоритет',
        damageMax: 4,
        probMax: 4,
        priorityMax: 4,
        riskAppetite: 12,
        costPerPoint: 50000
      };
      this.assets = [];
      this.risks = [];
      this.measures = [];
      this.isLoggedIn = false;
      return;
    }

    const [criteria, assets, risks, measures] = await Promise.all([
      db.getCriteria(),
      db.getAssets(),
      db.getRisks(),
      db.getMeasures(),
    ]);

    this.criteria = criteria || {
      formula: 'Урон ⋅ Вероятность ⋅ Приоритет',
      damageMax: 4,
      probMax: 4,
      priorityMax: 4,
      riskAppetite: 12,
      costPerPoint: 50000
    };
    this.assets = assets || [];
    this.risks = risks || [];
    this.measures = measures || [];
    this.isLoggedIn = true;
    if (this.currentUser?.login) {
      this.currentUser = {login: this.currentUser.login};
    }
    console.log('✅ Данные загружены из API');
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
    if (this.authForm.password.length < 4) {
      this.showNotification(
          '❌ Пароль должен быть не менее 4 символов', 'error');
      return;
    }

    const result =
        await db.registerUser(this.authForm.login, this.authForm.password);
    if (result.success) {
      db.currentUserId = result.userId;
      this.currentUser = {login: this.authForm.login};
      this.isLoggedIn = true;
      this.authModalOpen = false;
      localStorage.setItem(
          'securityAppSession',
          JSON.stringify({userId: result.userId, login: this.authForm.login}));
      await this.loadData();
      this.showNotification(
          `✅ Профиль "${this.currentUser.login}" создан и выполнен вход`,
          'success');
    } else {
      this.showNotification(`❌ ${result.error}`, 'error');
    }
  },

  async logout() {
    if (!confirm('Выйти из аккаунта?')) return;
    await db.logout();
    this.isLoggedIn = false;
    this.currentUser = {login: ''};
    localStorage.removeItem('securityAppSession');
    this.assets = [];
    this.risks = [];
    this.measures = [];
    this.showNotification('👋 Вы вышли из аккаунта', 'info');
  }
};
