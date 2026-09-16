import Alpine from 'alpinejs';
import { auth, setToken, criteriaApi, assetsApi, risksApi, measuresApi } from './api.js';

window.Alpine = Alpine;

Alpine.data('app', () => ({
  ready: false,
  isLoading: false,
  error: null,
  authForm: {
    login: '',
    password: '',
  },
  user: null,
  criteria: null,
  assets: [],
  risks: [],
  measures: [],

  async init() {
    this.ready = true;
    const token = localStorage.getItem('calculatrade_token');

    if (!token) {
      return;
    }

    try {
      this.isLoading = true;
      const profile = await auth.refresh(token);
      setToken(profile.data.token);
      await this.loadDashboard();
    } catch (error) {
      setToken(null);
      this.error = error.message;
    } finally {
      this.isLoading = false;
    }
  },

  async login() {
    if (!this.authForm.login || !this.authForm.password) {
      this.error = 'Введите логин и пароль';
      return;
    }

    try {
      this.isLoading = true;
      const response = await auth.login(this.authForm.login, this.authForm.password);
      setToken(response.data.token);
      this.user = response.data.user;
      this.authForm.login = '';
      this.authForm.password = '';
      this.error = null;
      await this.loadDashboard();
    } catch (error) {
      this.error = error.message;
    } finally {
      this.isLoading = false;
    }
  },

  async loadDashboard() {
    const [criteria, assets, risks, measures] = await Promise.all([
      criteriaApi.get(),
      assetsApi.list(),
      risksApi.list(),
      measuresApi.list(),
    ]);

    this.criteria = criteria.data || null;
    this.assets = assets.data || [];
    this.risks = risks.data || [];
    this.measures = measures.data || [];
  },

  async logout() {
    try {
      await auth.logout();
    } catch (error) {
      console.warn(error);
    } finally {
      setToken(null);
      this.user = null;
      this.criteria = null;
      this.assets = [];
      this.risks = [];
      this.measures = [];
      this.error = null;
    }
  },
}));

Alpine.start();
