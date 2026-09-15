/*
  Функционал вкладки "Риски"
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.risks = {
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
      score,
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

  updateRiskField(riskId, field, value) {
    const risk = this.risks.find(r => r.id === riskId);
    if (!risk) return;
    db.updateRisk(riskId, {[field]: value});
    this.showNotification('✅ Риск обновлен', 'success');
  },

  recalculateRiskScore(risk) {
    const asset = this.assets.find(a => a.id === risk.assetId);
    if (!asset) return;
    risk.score =
        this.calculateRisk(risk.damage, risk.probability, asset.priority);
    if (risk.measureId) {
      const measure = this.measures.find(m => m.id === risk.measureId);
      if (measure) {
        risk.residualScore = this.calculateResidualRisk(
            risk, measure.reduceDamage, measure.reduceProb);
      }
    }
    db.updateRisk(risk.id, {
      damage: risk.damage,
      probability: risk.probability,
      score: risk.score,
      residualScore: risk.residualScore
    });
    this.showNotification('✅ Параметры риска обновлены', 'success');
  },

  deleteRisk(id) {
    db.deleteRisk(id);
    this.risks = this.risks.filter(r => r.id !== id);
    this.showNotification('✅ Риск удалён', 'success');
  }
};
