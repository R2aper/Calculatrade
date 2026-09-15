/*
  Расчеты основых параметров
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.calculations = {
  calculateRisk(damage, probability, priority) {
    return damage * probability * priority;
  },

  calculateResidualRisk(risk, reduceDamage, reduceProb) {
    const newDamage = risk.damage * (1 - reduceDamage / 100);
    const newProb = risk.probability * (1 - reduceProb / 100);
    return Math.max(1, Math.round(newDamage * newProb * risk.priority));
  },

  calculateExpectedLoss(riskScore) {
    return riskScore * this.criteria.costPerPoint;
  },

  calculateROSI(effect, cost) {
    return cost > 0 ? Math.round((effect / cost) * 100) : 0;
  },

  calculateNetROSI(effect, cost) {
    return cost > 0 ? Math.round(((effect - cost) / cost) * 100) : 0;
  },

  calculatePayback(cost, annualSaving) {
    return annualSaving > 0 ? (cost / annualSaving).toFixed(1) : '∞';
  }
};
