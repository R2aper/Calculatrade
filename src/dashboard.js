/*
  Функционал вкладки "Обзор"
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.dashboard = {
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

  get totalRiskBefore() {
    return this.risks.reduce((sum, r) => sum + r.score, 0);
  },

  get totalRiskAfter() {
    return this.risks.reduce((sum, r) => sum + (r.residualScore || r.score), 0);
  },

  get totalEffect() {
    return this.risks.reduce((sum, r) => {
      if (r.residualScore === null) return sum;
      return sum +
          (this.calculateExpectedLoss(r.score) -
           this.calculateExpectedLoss(r.residualScore));
    }, 0);
  },

  get avgROI() {
    const rosis = this.risks.filter(r => r.residualScore !== null).map(r => {
      const effect = this.calculateExpectedLoss(r.score) -
          this.calculateExpectedLoss(r.residualScore);
      const cost =
          this.measures.find(m => m.id === r.measureId)?.cost || 100000;
      return this.calculateNetROSI(effect, cost);
    });
    return rosis.length ?
        Math.round(rosis.reduce((a, b) => a + b, 0) / rosis.length) :
        0;
  },

  get lastRisks() {
    return this.risks.slice(0, 3);
  },

  get economicSummaryBefore() {
    return this.risks.reduce(
        (s, r) => s + this.calculateExpectedLoss(r.score), 0);
  },

  get economicSummaryAfter() {
    return this.risks.reduce(
        (s, r) => s + this.calculateExpectedLoss(r.residualScore || r.score),
        0);
  },

  get economicTotalCost() {
    return this.measures.reduce((s, m) => s + m.cost, 0);
  },

  get economicTotalEffect() {
    return this.economicSummaryBefore - this.economicSummaryAfter -
        this.economicTotalCost;
  },

  async resetAll() {
    if (!confirm('Сбросить ВСЕ данные текущего пользователя?')) return;
    await db.resetUserData();
    this.assets = [];
    this.risks = [];
    this.measures = [];
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
};
