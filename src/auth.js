/*
 Авторизация
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.auth = {
  async init() {
    this.dbInitialized = await db.init();
    if (!this.dbInitialized) {
      this.showNotification('❌ Сервер API недоступен', 'error');
      return;
    }
    if (db.isLoggedIn()) {
      this.isLoggedIn = true;
      this.currentUser = db.currentUser;
      await this.loadData();
    }
  },

  async loadData() {
    if (!db.isLoggedIn()) return;
    this.loading = true;
    try {
      [this.criteria, this.assets, this.risks, this.measures] =
          await Promise.all([
            db.getCriteria(), db.getAssets(), db.getRisks(), db.getMeasures()
          ]);
    } catch (error) {
      if (error.status === 401) {
        this.isLoggedIn = false;
        this.currentUser = {login: ''};
        this.showNotification('❌ Сессия истекла, войдите снова', 'error');
      } else {
        this.showNotification(`❌ Не удалось загрузить данные: ${error.message}`, 'error');
      }
    } finally {
      this.loading = false;
    }
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
    if (this.authForm.password.length < 8) {
      this.showNotification(
          '❌ Пароль должен быть не менее 8 символов', 'error');
      return;
    }
    const result =
        await db.registerUser(this.authForm.login, this.authForm.password);
    if (result.success) {
      db.currentUserId = result.userId;
      this.currentUser = {login: this.authForm.login};
      this.isLoggedIn = true;
      this.authModalOpen = false;
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
    try {
      await db.logout();
      this.isLoggedIn = false;
      this.currentUser = {login: ''};
      this.assets = [];
      this.risks = [];
      this.measures = [];
      this.showNotification('👋 Вы вышли из аккаунта', 'info');
    } catch (error) {
      this.showNotification(`❌ Не удалось выйти: ${error.message}`, 'error');
    }
  }
};
