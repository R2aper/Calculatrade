/*
 * Клиент backend API.
 *
 * Методы намеренно сохраняют прежние имена, чтобы модули интерфейса не
 * зависели от способа хранения данных.
 */

class SecurityDatabase {
  constructor() {
    this.currentUserId = null;
    this.currentUser = null;
    this.apiBase = (window.CALCULATRADE_API_URL || window.location.origin).replace(/\/$/, '');
  }

  async request(path, options = {}) {
    const headers = {...(options.headers || {})};
    if (options.body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${this.apiBase}${path}`, {
      ...options,
      credentials: 'include',
      headers
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error?.message || `Ошибка API (${response.status})`);
      error.status = response.status;
      error.code = body.error?.code;
      throw error;
    }
    return this.normalizeResponse(path, body);
  }

  normalizeResponse(path, body) {
    const numericFields = {
      '/api/criteria': [
        'damageMax', 'probMax', 'priorityMax', 'riskAppetite', 'costPerPoint'
      ],
      '/api/assets': ['value', 'priority'],
      '/api/measures': ['cost', 'reduceDamage', 'reduceProb'],
      '/api/risks': [
        'damage', 'probability', 'priority', 'score', 'residualScore',
        'reduceDamage', 'reduceProb'
      ]
    };
    const fields = Object.entries(numericFields)
        .find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1];
    if (!fields) return body;

    const normalize = value => {
      if (Array.isArray(value)) return value.map(normalize);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key, fields.includes(key) && item !== null ? Number(item) : normalize(item)
      ]));
    };
    return normalize(body);
  }

  async init() {
    try {
      const result = await this.request('/api/auth/me');
      this.currentUser = result.user;
      this.currentUserId = result.user.id;
      return true;
    } catch (error) {
      if (error.status === 401) {
        this.currentUser = null;
        this.currentUserId = null;
        return true;
      }
      console.error('❌ Ошибка подключения к API:', error);
      return false;
    }
  }

  async registerUser(login, password) {
    try {
      const result = await this.request('/api/auth/register', {
        method: 'POST', body: JSON.stringify({login, password})
      });
      this.currentUser = result.user;
      this.currentUserId = result.user.id;
      return {success: true, userId: result.user.id, login: result.user.login};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async loginUser(login, password) {
    try {
      const result = await this.request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({login, password})
      });
      this.currentUser = result.user;
      this.currentUserId = result.user.id;
      return {success: true, userId: result.user.id, login: result.user.login};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', {method: 'POST'});
    } finally {
      this.currentUser = null;
      this.currentUserId = null;
    }
  }

  isLoggedIn() { return this.currentUserId !== null; }
  getCurrentUserId() { return this.currentUserId; }

  async saveCriteria(criteria) {
    await this.request('/api/criteria', {method: 'PUT', body: JSON.stringify(criteria)});
    return true;
  }
  async getCriteria() { return this.request('/api/criteria'); }

  async addAsset(asset) {
    return this.request('/api/assets', {method: 'POST', body: JSON.stringify(asset)});
  }
  async getAssets() { return this.request('/api/assets'); }
  async updateAsset(id, updates) {
    return this.request(`/api/assets/${id}`, {method: 'PATCH', body: JSON.stringify(updates)});
  }
  async deleteAsset(id) {
    return this.request(`/api/assets/${id}`, {method: 'DELETE'});
  }

  async addRisk(risk) {
    return this.request('/api/risks', {method: 'POST', body: JSON.stringify(risk)});
  }
  async getRisks() { return this.request('/api/risks'); }
  async updateRisk(id, updates) {
    const normalized = {...updates};
    if ('measure_id' in normalized) {
      normalized.measureId = normalized.measure_id;
      delete normalized.measure_id;
    }
    return this.request(`/api/risks/${id}`, {method: 'PATCH', body: JSON.stringify(normalized)});
  }
  async deleteRisk(id) {
    return this.request(`/api/risks/${id}`, {method: 'DELETE'});
  }

  async addMeasure(measure) {
    return this.request('/api/measures', {method: 'POST', body: JSON.stringify(measure)});
  }
  async getMeasures() { return this.request('/api/measures'); }
  async updateMeasure(id, updates) {
    const normalized = {...updates};
    if ('linked_risk_id' in normalized) {
      normalized.linkedRiskId = normalized.linked_risk_id;
      delete normalized.linked_risk_id;
    }
    return this.request(`/api/measures/${id}`, {method: 'PATCH', body: JSON.stringify(normalized)});
  }
  async deleteMeasure(id) {
    return this.request(`/api/measures/${id}`, {method: 'DELETE'});
  }

  async resetUserData() {
    await this.request('/api/me/reset', {method: 'POST'});
    return true;
  }
  async deleteUser(_, password) {
    await this.request('/api/me', {method: 'DELETE', body: JSON.stringify({password})});
    this.currentUser = null;
    this.currentUserId = null;
    return true;
  }
}

const db = new SecurityDatabase();
