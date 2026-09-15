/*
  Функционал вкладки "Активы"
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatrbadeModules.assets = {
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
      this.showNotification('❌ Приоритет должен быть от 1 до 4', 'error');
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

  updateAsset(assetId, updates) {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return;

    // Обновляем в объекте
    Object.assign(asset, updates);

    // Сохраняем в БД
    db.updateAsset(assetId, updates);

    this.showNotification('✅ Актив обновлен', 'success');
  },

  deleteAsset(id) {
    const asset = this.assets.find(a => a.id === id);
    const linkedRisks = this.risks.filter(r => r.assetId === id);

    if (linkedRisks.length > 0) {
      const confirm_delete = confirm(
          `Актив "${asset.name}" имеет ${linkedRisks.length} риск(ов). 
                     Они будут удалены. Продолжить?`);
      if (!confirm_delete) return;
    }

    db.deleteAsset(id);
    this.assets = this.assets.filter(a => a.id !== id);
    this.risks = this.risks.filter(r => r.assetId !== id);

    this.showNotification('✅ Актив удалён', 'success');
  }
}
