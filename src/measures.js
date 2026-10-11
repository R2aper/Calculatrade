/*
  Функционал вкладки "Меры"
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.measures = {
  openAddMeasureModal() {
    this.measureForm = {name: '', cost: '', reduceDamage: 40, reduceProb: 80};
    this.addMeasureModalOpen = true;
  },

  closeAddMeasureModal() {
    this.addMeasureModalOpen = false;
    this.measureForm = {name: '', cost: '', reduceDamage: 40, reduceProb: 80};
  },

  async submitMeasure() {
    if (!this.measureForm.name.trim()) {
      this.showNotification('✗ Введите название защитной меры', 'error');
      return;
    }
    if (!this.measureForm.cost || isNaN(this.measureForm.cost)) {
      this.showNotification('✗ Введите корректную стоимость', 'error');
      return;
    }
    if (this.measureForm.reduceDamage < 0 ||
        this.measureForm.reduceDamage > 100) {
      this.showNotification('✗ Снижение ущерба должно быть 0-100%', 'error');
      return;
    }
    if (this.measureForm.reduceProb < 0 || this.measureForm.reduceProb > 100) {
      this.showNotification(
          '✗ Снижение вероятности должно быть 0-100%', 'error');
      return;
    }
    const measure = await db.addMeasure({
      name: this.measureForm.name,
      cost: parseInt(this.measureForm.cost),
      reduceDamage: parseInt(this.measureForm.reduceDamage),
      reduceProb: parseInt(this.measureForm.reduceProb)
    });
    if (measure) {
      this.measures.push(measure);
      this.closeAddMeasureModal();
      this.showNotification(
          `✓ Защитная мера "${this.measureForm.name}" добавлена`, 'success');
    }
  },

  async updateMeasureField(measureId, field, value) {
    const measure = this.measures.find(m => m.id === measureId);
    if (!measure) return;
    Object.assign(measure, {[field]: value});
    await db.updateMeasure(measureId, {[field]: value});
    if ((field === 'reduceDamage' || field === 'reduceProb') &&
        measure.linkedRiskId) {
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
    this.showNotification('✓ Мера обновлена', 'success');
  },

  async deleteMeasure(id) {
    await db.deleteMeasure(id);
    this.measures = this.measures.filter(m => m.id !== id);
    for (const r of this.risks) {
      if (r.measureId === id) {
        r.measureId = null;
        r.reduceDamage = 0;
        r.reduceProb = 0;
        r.residualScore = null;
        await db.updateRisk(r.id, {
          measure_id: null,
          reduceDamage: 0,
          reduceProb: 0,
          residualScore: null
        });
      }
    }
    this.showNotification('✓ Мера удалена', 'success');
  },

  openLinkMeasureModal(riskId) {
    this.currentRiskIdForMeasureLinking = riskId;
    const risk = this.risks.find(item => item.id === riskId);
    this.selectedMeasureIdForLinking =
        risk?.measureId ? String(risk.measureId) : '';
    this.linkMeasureModalOpen = true;
  },

  closeLinkMeasureModal() {
    this.linkMeasureModalOpen = false;
    this.currentRiskIdForMeasureLinking = null;
    this.selectedMeasureIdForLinking = '';
  },

  getAvailableMeasuresForLinking() {
    return this.measures.map(measure => {
      const linkedRisk = this.risks.find(
          risk => risk.id === measure.linkedRiskId &&
              risk.id !== this.currentRiskIdForMeasureLinking);
      const linkedLabel =
          linkedRisk ? ` [привязана к: ${linkedRisk.threat}]` : '';
      return {
        id: measure.id,
        label: `${measure.name} (-${measure.reduceDamage}% ущерб, ` +
            `-${measure.reduceProb}% вер., ` +
            `${Number(measure.cost).toLocaleString('ru')} ₽)${linkedLabel}`
      };
    });
  },

  async confirmLinkMeasureToRisk() {
    const risk = this.risks.find(
        item => item.id === this.currentRiskIdForMeasureLinking);
    const measure = this.measures.find(
        item => String(item.id) === this.selectedMeasureIdForLinking);
    if (!risk || !measure) {
      this.showNotification('✗ Выберите защитную меру', 'error');
      return;
    }

    try {
      if (measure.linkedRiskId && measure.linkedRiskId !== risk.id) {
        const oldRisk =
            this.risks.find(item => item.id === measure.linkedRiskId);
        if (oldRisk) await this.unlinkRisk(oldRisk, false);
      }
      if (risk.measureId && risk.measureId !== measure.id) {
        const oldMeasure =
            this.measures.find(item => item.id === risk.measureId);
        if (oldMeasure) {
          oldMeasure.linkedRiskId = null;
          await db.updateMeasure(oldMeasure.id, {linkedRiskId: null});
        }
      }
      await this.linkRiskToMeasure(risk, measure);
      this.closeLinkMeasureModal();
      this.showNotification(
          `✓ Мера "${measure.name}" привязана к риску "${risk.threat}"`,
          'success');
    } catch (error) {
      this.showNotification(
          `✗ Не удалось привязать меру: ${error.message}`, 'error');
    }
  },

  openLinkMeasureRiskModal(measureId) {
    this.currentMeasureIdForLinking = measureId;
    const measure = this.measures.find(item => item.id === measureId);
    this.selectedRiskIdForLinking =
        measure?.linkedRiskId ? String(measure.linkedRiskId) : '';
    this.linkMeasureRiskModalOpen = true;
  },

  closeLinkMeasureRiskModal() {
    this.linkMeasureRiskModalOpen = false;
    this.currentMeasureIdForLinking = null;
    this.selectedRiskIdForLinking = '';
  },

  async linkRiskToMeasure(risk, measure) {
    risk.measureId = measure.id;
    risk.reduceDamage = measure.reduceDamage;
    risk.reduceProb = measure.reduceProb;
    measure.linkedRiskId = risk.id;
    risk.residualScore = this.calculateResidualRisk(
        risk, measure.reduceDamage, measure.reduceProb);
    await db.updateRisk(risk.id, {
      measure_id: risk.measureId,
      reduceDamage: risk.reduceDamage,
      reduceProb: risk.reduceProb,
      residualScore: risk.residualScore
    });
    await db.updateMeasure(measure.id, {linkedRiskId: risk.id});
  },

  async confirmLinkMeasureRisk() {
    const riskId = this.selectedRiskIdForLinking;
    if (!riskId) {
      this.showNotification('✗ Выберите риск!', 'error');
      return;
    }
    const risk = this.risks.find(r => String(r.id) === riskId);
    const measure =
        this.measures.find(m => m.id === this.currentMeasureIdForLinking);
    if (!risk) {
      this.showNotification('✗ Риск не найден', 'error');
      return;
    }
    if (!measure) {
      this.showNotification('✗ Мера не найдена', 'error');
      return;
    }
    try {
      if (risk.measureId && risk.measureId !== measure.id) {
        const oldMeasure = this.measures.find(m => m.id === risk.measureId);
        if (oldMeasure) {
          oldMeasure.linkedRiskId = null;
          await db.updateMeasure(oldMeasure.id, {linkedRiskId: null});
        }
      }
      if (measure.linkedRiskId && measure.linkedRiskId !== risk.id) {
        const oldRisk = this.risks.find(r => r.id === measure.linkedRiskId);
        if (oldRisk) await this.unlinkRisk(oldRisk, false);
      }
      await this.linkRiskToMeasure(risk, measure);
      this.closeLinkMeasureRiskModal();
      this.showNotification(
          `✓ Мера "${measure.name}" привязана к риску "${risk.threat}"`,
          'success');
    } catch (error) {
      this.showNotification(
          `✗ Не удалось привязать риск: ${error.message}`, 'error');
    }
  },

  async unlinkRisk(risk, notify = true) {
    const measure = this.measures.find(
        item => item.id === risk.measureId || item.linkedRiskId === risk.id);
    if (measure) {
      measure.linkedRiskId = null;
      await db.updateMeasure(measure.id, {linkedRiskId: null});
    }
    risk.measureId = null;
    risk.reduceDamage = 0;
    risk.reduceProb = 0;
    risk.residualScore = null;
    await db.updateRisk(risk.id, {
      measure_id: null,
      reduceDamage: 0,
      reduceProb: 0,
      residualScore: null
    });
    if (notify) {
      this.showNotification(
          `✓ Мера отвязана от риска "${risk.threat}"`, 'success');
    }
  },

  async unlinkMeasureFromRisk(riskId) {
    const risk = this.risks.find(r => r.id === riskId);
    if (risk) await this.unlinkRisk(risk);
  },

  getAvailableRisksForMeasureLinking() {
    return this.risks.map(r => {
      const asset = this.assets.find(a => a.id === r.assetId);
      const isBound =
          r.measureId && r.measureId !== this.currentMeasureIdForLinking;
      return {
        id: r.id,
        label: `${r.threat} (${
            asset ? asset.name : 'Актив ID:' + r.assetId}) - Риск: ${r.score}${
            isBound ? ' [есть другая мера]' : ''}`
      };
    });
  }
};
