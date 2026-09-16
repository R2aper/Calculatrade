/*
  UI
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.ui = {
  showTab(n) {
    this.currentTab = n;
  },

  showNotification(message, type = 'success', duration = 3000) {
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    this.notification.message = message;
    this.notification.type = type;
    this.notification.show = true;
    this.notificationTimeout = setTimeout(() => {
      this.notification.show = false;
    }, duration);
  },

  hideNotification() {
    this.notification.show = false;
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
  },

  async saveCriteria() {
    const saved = await db.saveCriteria(this.criteria);
    this.showNotification(
        saved ? '✅ Критерии сохранены!' : '❌ Ошибка сохранения критериев',
        saved ? 'success' : 'error');
  }
};
