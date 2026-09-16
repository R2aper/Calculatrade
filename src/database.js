/*
  API-обёртка для PostgreSQL/Express вместо SQL.js/localStorage
*/

class SecurityDatabase {
  constructor() {
    this.currentUserId = null;
    this.baseUrl = window.__API_BASE_URL__ || 'http://localhost:4000/api';
  }

  decodeToken(token) {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const decoded = decodeURIComponent(
        Array.from(binary).map(
            char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join(''));

    return JSON.parse(decoded);
  }

  async request(path, options = {}) {
    const token = localStorage.getItem('calculatrade_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      body: options.body && typeof options.body !== 'string' ?
          JSON.stringify(options.body) :
          options.body,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(data?.message || data?.error || 'Ошибка запроса к API');
    }

    return data;
  }

  setSession(token, user) {
    localStorage.setItem('calculatrade_token', token);
    localStorage.setItem(
        'securityAppSession',
        JSON.stringify({userId: user?.id || this.currentUserId, login: user?.login || ''}));
  }

  clearSession() {
    localStorage.removeItem('calculatrade_token');
    localStorage.removeItem('securityAppSession');
    this.currentUserId = null;
  }

  async init() {
    const token = localStorage.getItem('calculatrade_token');
    if (!token) return true;

    try {
      const payload = this.decodeToken(token);
      if (payload?.userId) {
        this.currentUserId = payload.userId;
        return true;
      }
    } catch (error) {
      console.warn('⚠️ JWT token is invalid, clearing session', error);
    }

    this.clearSession();
    return true;
  }

  async registerUser(login, password) {
    try {
      const data = await this.request('/auth/register', {
        method: 'POST',
        body: {login, password}
      });

      this.currentUserId = data.user.id;
      this.setSession(data.token, data.user);
      return {success: true, userId: data.user.id, login: data.user.login};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async loginUser(login, password) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: {login, password}
      });

      this.currentUserId = data.user.id;
      this.setSession(data.token, data.user);
      return {success: true, userId: data.user.id, login: data.user.login};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', {method: 'POST'});
    } catch (error) {
      console.warn('⚠️ Logout request failed, continuing client-side clear', error);
    }

    this.clearSession();
    return true;
  }

  isLoggedIn() {
    return Boolean(this.currentUserId);
  }

  getCurrentUserId() {
    return this.currentUserId;
  }

  async saveCriteria(criteria) {
    if (!this.currentUserId) return false;

    await this.request('/criteria', {
      method: 'PUT',
      body: criteria,
    });

    return true;
  }

  async getCriteria() {
    if (!this.currentUserId) return null;

    try {
      const data = await this.request('/criteria');
      return data || null;
    } catch (error) {
      return null;
    }
  }

  async addAsset(asset) {
    if (!this.currentUserId) return null;

    const data = await this.request('/assets', {
      method: 'POST',
      body: {
        name: asset.name,
        value: Number(asset.value),
        priority: Number(asset.priority),
      },
    });

    return {...asset, id: data.id, userId: this.currentUserId};
  }

  async getAssets() {
    if (!this.currentUserId) return [];

    try {
      const data = await this.request('/assets');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async updateAsset(id, updates) {
    if (!this.currentUserId) return false;

    await this.request(`/assets/${id}`, {
      method: 'PUT',
      body: updates,
    });

    return true;
  }

  async deleteAsset(id) {
    if (!this.currentUserId) return false;

    await this.request(`/assets/${id}`, {method: 'DELETE'});
    return true;
  }

  async addRisk(risk) {
    if (!this.currentUserId) return null;

    const data = await this.request('/risks', {
      method: 'POST',
      body: {
        assetId: risk.assetId,
        threat: risk.threat,
        vulnerability: risk.vulnerability,
        damage: Number(risk.damage),
        probability: Number(risk.probability),
        priority: Number(risk.priority),
        score: Number(risk.score),
        residualScore: risk.residualScore,
        measureId: risk.measureId || null,
        reduceDamage: Number(risk.reduceDamage || 0),
        reduceProb: Number(risk.reduceProb || 0),
      },
    });

    return {...risk, id: data.id, userId: this.currentUserId};
  }

  async getRisks() {
    if (!this.currentUserId) return [];

    try {
      const data = await this.request('/risks');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async updateRisk(id, updates) {
    if (!this.currentUserId) return false;

    const normalized = {};
    for (const [key, value] of Object.entries(updates || {})) {
      const mapped = {
        asset_id: 'assetId',
        measure_id: 'measureId',
        residual_score: 'residualScore',
        reduceDamage: 'reduceDamage',
        reduceProb: 'reduceProb',
      }[key] || key;
      normalized[mapped] = value;
    }

    await this.request(`/risks/${id}`, {
      method: 'PUT',
      body: normalized,
    });

    return true;
  }

  async deleteRisk(id) {
    if (!this.currentUserId) return false;

    await this.request(`/risks/${id}`, {method: 'DELETE'});
    return true;
  }

  async addMeasure(measure) {
    if (!this.currentUserId) return null;

    const data = await this.request('/measures', {
      method: 'POST',
      body: {
        name: measure.name,
        cost: Number(measure.cost),
        reduceDamage: Number(measure.reduceDamage),
        reduceProb: Number(measure.reduceProb),
      },
    });

    return {...measure, id: data.id, userId: this.currentUserId};
  }

  async getMeasures() {
    if (!this.currentUserId) return [];

    try {
      const data = await this.request('/measures');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async updateMeasure(id, updates) {
    if (!this.currentUserId) return false;

    await this.request(`/measures/${id}`, {
      method: 'PUT',
      body: updates,
    });

    return true;
  }

  async deleteMeasure(id) {
    if (!this.currentUserId) return false;

    await this.request(`/measures/${id}`, {method: 'DELETE'});
    return true;
  }

  async resetUserData() {
    if (!this.currentUserId) return false;

    try {
      const criteria = await this.getCriteria();
      if (criteria) {
        await this.saveCriteria({
          ...criteria,
          formula: 'damage * probability * priority',
          damageMax: 4,
          probMax: 4,
          priorityMax: 4,
          riskAppetite: 12,
          costPerPoint: 50000,
        });
      }

      const assets = await this.getAssets();
      for (const asset of assets) {
        await this.deleteAsset(asset.id);
      }

      const risks = await this.getRisks();
      for (const risk of risks) {
        await this.deleteRisk(risk.id);
      }

      const measures = await this.getMeasures();
      for (const measure of measures) {
        await this.deleteMeasure(measure.id);
      }
    } catch (error) {
      console.warn('⚠️ Reset failed', error);
      return false;
    }

    return true;
  }

  async deleteUser(userId) {
    return true;
  }

  exportDb() {
    return null;
  }
}

const db = new SecurityDatabase();