const id = value => /^\d+$/.test(String(value)) ? String(value) : null;
const text = (value, max = 500) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
function validate(type, body, partial = false) {
  const rules = {
    asset: { name: v => text(v, 200), value: v => typeof v === 'number' && v >= 0, priority: v => integer(v, 1, 4) },
    measure: { name: v => text(v, 200), cost: v => typeof v === 'number' && v >= 0, reduceDamage: v => integer(v, 0, 100), reduceProb: v => integer(v, 0, 100), linkedRiskId: v => v === null || id(v) !== null },
    risk: { threat: v => text(v, 500), vulnerability: v => text(v, 500), assetId: v => id(v) !== null, damage: v => integer(v, 1, 4), probability: v => integer(v, 1, 4), priority: v => integer(v, 1, 4), score: v => integer(v, 0, 4096), residualScore: v => v === null || integer(v, 0, 4096), measureId: v => v === null || id(v) !== null, reduceDamage: v => integer(v, 0, 100), reduceProb: v => integer(v, 0, 100) },
    criteria: { formula: v => text(v, 200), damageMax: v => integer(v, 1, 4), probMax: v => integer(v, 1, 4), priorityMax: v => integer(v, 1, 4), riskAppetite: v => integer(v, 4, 64), costPerPoint: v => typeof v === 'number' && v >= 0 }
  };
  const errors = [];
  for (const [key, rule] of Object.entries(rules[type])) if ((!partial || body[key] !== undefined) && !rule(body[key])) errors.push(key);
  return errors;
}
module.exports = { id, validate };
