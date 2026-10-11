/*
  Исходное состояние
*/

window.CalculatradeModules = window.CalculatradeModules || {};

window.CalculatradeModules.createState = () => ({
  currentTab: 0,
  criteria: {
    formula: 'Урон ⋅ Вероятность ⋅ Приоритет',
    damageMax: 4,
    probMax: 4,
    priorityMax: 4,
    riskAppetite: 12,
    costPerPoint: 50000
  },
  assets: [],
  risks: [],
  measures: [],
  riskSearch: '',
  riskFilter: 'all',
  selectedRiskId: null,
  riskSort: 'score-desc',
  currentMeasureIdForLinking: null,
  linkMeasureModalOpen: false,
  linkMeasureRiskModalOpen: false,
  currentRiskIdForMeasureLinking: null,
  selectedMeasureIdForLinking: '',
  selectedRiskIdForLinking: '',
  isLoggedIn: false,
  currentUser: {login: ''},
  authModalOpen: false,
  authTab: 'login',
  authForm: {login: '', password: ''},
  dbInitialized: false,
  addAssetModalOpen: false,
  addRiskModalOpen: false,
  addMeasureModalOpen: false,
  assetForm: {name: '', value: '', priority: 3},
  riskForm:
      {threat: '', vulnerability: '', assetId: null, damage: 2, probability: 2},
  measureForm: {name: '', cost: '', reduceDamage: 40, reduceProb: 80},
  notification: {show: false, message: '', type: 'success'},
  loading: false,
  notificationTimeout: null
});
