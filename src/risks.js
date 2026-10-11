/*
  Функционал вкладки "Риски"
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.risks = {
  get filteredRisks() {
    let result = [...this.risks];
    const query = this.riskSearch.trim().toLocaleLowerCase('ru');

    if (query) {
      result = result.filter(risk => {
        const asset = this.assets.find(item => item.id === risk.assetId);
        const text = `${risk.threat || ''} ${risk.vulnerability || ''} ${
            asset?.name || ''}`;
        return text.toLocaleLowerCase('ru').includes(query);
      });
    }

    if (this.riskFilter !== 'all') {
      result = result.filter(
          risk => this.getRiskCategory(risk.score) === this.riskFilter);
    }

    result.sort((a, b) => {
      if (this.riskSort === 'score-asc') return a.score - b.score;
      if (this.riskSort === 'name') {
        return (a.threat || '').localeCompare(b.threat || '', 'ru');
      }
      return b.score - a.score;
    });
    return result;
  },

  get selectedRisk() {
    return this.risks.find(risk => risk.id === this.selectedRiskId) || null;
  },

  get riskStats() {
    return {
      total: this.risks.length,
      high:
          this.risks.filter(risk => this.getRiskCategory(risk.score) === 'high')
              .length,
      medium: this.risks
                  .filter(risk => this.getRiskCategory(risk.score) === 'medium')
                  .length,
      controlled: this.risks.filter(risk => risk.residualScore != null).length
    };
  },

  selectRisk(id) {
    this.selectedRiskId = id;
  },

  getRiskAsset(risk) {
    return this.assets.find(asset => asset.id === risk.assetId) || null;
  },

  getRiskMeasure(risk) {
    return this.measures.find(
               measure => measure.id === risk.measureId ||
                   measure.linkedRiskId === risk.id) ||
        null;
  },

  openAddRiskModal() {
    if (this.assets.length === 0) {
      this.showNotification('✗ Сначала создайте актив!', 'error');
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
    if (!this.riskForm.threat.trim()) {
      this.showNotification('✗ Введите описание угрозы', 'error');
      return;
    }
    if (!this.riskForm.vulnerability.trim()) {
      this.showNotification('✗ Введите описание уязвимости', 'error');
      return;
    }
    if (!this.riskForm.assetId) {
      this.showNotification('✗ Выберите актив', 'error');
      return;
    }
    const asset = this.assets.find(a => a.id === this.riskForm.assetId);
    if (!asset) {
      this.showNotification('✗ Актив не найден', 'error');
      return;
    }
    const score = this.calculateRisk(
        this.riskForm.damage, this.riskForm.probability, asset.priority);
    const risk = await db.addRisk({
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
          `✓ Риск добавлен к активу "${asset.name}"`, 'success');
    }
  },

  async updateRiskField(riskId, field, value) {
    const risk = this.risks.find(r => r.id === riskId);
    if (!risk) return;
    await db.updateRisk(riskId, {[field]: value});
    this.showNotification('✓ Риск обновлен', 'success');
  },

  async recalculateRiskScore(risk) {
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
    await db.updateRisk(risk.id, {
      damage: risk.damage,
      probability: risk.probability,
      score: risk.score,
      residualScore: risk.residualScore
    });
    this.showNotification('✓ Параметры риска обновлены', 'success');
  },

  async deleteRisk(id) {
    const risk = this.risks.find(item => item.id === id);
    if (!risk || !confirm(`Удалить риск «${risk.threat}»?`)) return;
    try {
      await db.deleteRisk(id);
      this.risks = this.risks.filter(item => item.id !== id);
      for (const measure of this.measures) {
        if (measure.linkedRiskId === id) {
          measure.linkedRiskId = null;
        }
      }
      if (this.selectedRiskId === id) this.selectedRiskId = null;
      this.showNotification('✓ Риск удалён', 'success');
    } catch (error) {
      this.showNotification(
          `✗ Не удалось удалить риск: ${error.message}`, 'error');
    }
  }
};
