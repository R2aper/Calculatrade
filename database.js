// ====================== БАЗА ДАННЫХ (SQL.JS) ======================

class SecurityDatabase {
  constructor() {
    this.db = null;
    this.currentUserId = null;
  }

  // Инициализация базы данных
  async init() {
    try {
      // Загружаем sql.js
      const SQL = await initSqlJs({
        locateFile: file =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      // Проверяем, есть ли сохранённая БД в localStorage
      const savedDb = localStorage.getItem('securityAppDb');

      if (savedDb) {
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(uint8Array);
      } else {
        this.db = new SQL.Database();
        this.createTables();
      }

      console.log('✅ База данных инициализирована');
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации БД:', error);
      return false;
    }
  }

  // Создание таблиц
  createTables() {
    this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                login TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    this.db.run(`
            CREATE TABLE IF NOT EXISTS criteria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                formula TEXT DEFAULT 'damage * probability * priority',
                damageMax INTEGER DEFAULT 4,
                probMax INTEGER DEFAULT 4,
                priorityMax INTEGER DEFAULT 4,
                riskAppetite INTEGER DEFAULT 12,
                costPerPoint INTEGER DEFAULT 50000,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

    this.db.run(`
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                value INTEGER NOT NULL,
                priority INTEGER DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

    this.db.run(`
            CREATE TABLE IF NOT EXISTS risks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                asset_id INTEGER NOT NULL,
                threat TEXT NOT NULL,
                vulnerability TEXT NOT NULL,
                damage INTEGER DEFAULT 2,
                probability INTEGER DEFAULT 2,
                priority INTEGER DEFAULT 3,
                score INTEGER DEFAULT 0,
                residualScore INTEGER,
                measure_id INTEGER,
                reduceDamage INTEGER DEFAULT 0,
                reduceProb INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (asset_id) REFERENCES assets(id),
                FOREIGN KEY (measure_id) REFERENCES measures(id)
            )
        `);

    this.db.run(`
            CREATE TABLE IF NOT EXISTS measures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                cost INTEGER NOT NULL,
                reduceDamage INTEGER DEFAULT 40,
                reduceProb INTEGER DEFAULT 80,
                linkedRiskId INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (linkedRiskId) REFERENCES risks(id)
            )
        `);

    this.saveToLocalStorage();
    console.log('✅ Таблицы созданы');
  }

  // Сохранение БД в localStorage
  saveToLocalStorage() {
    if (this.db) {
      const data = this.db.export();
      const arr = Array.from(data);
      localStorage.setItem('securityAppDb', JSON.stringify(arr));
    }
  }

  // Регистрация пользователя
  registerUser(login, password) {
    try {
      this.db.run(
          'INSERT INTO users (login, password) VALUES (?, ?)',
          [login, password]);

      const result = this.db.exec('SELECT last_insert_rowid()');
      const userId = result[0].values[0][0];

      // Создаём критерии по умолчанию для нового пользователя
      this.db.run(
          `INSERT INTO criteria (user_id, formula, damageMax, probMax, 
                 priorityMax, riskAppetite, costPerPoint) 
                 VALUES (?, 'damage * probability * priority', 4, 4, 4, 12, 50000)`,
          [userId]);

      this.saveToLocalStorage();
      return {success: true, userId};
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return {success: false, error: 'Пользователь уже существует'};
      }
      return {success: false, error: error.message};
    }
  }

  // Авторизация пользователя
  loginUser(login, password) {
    try {
      const result = this.db.exec(
          'SELECT id, login FROM users WHERE login = ? AND password = ?',
          [login, password]);

      if (result.length > 0 && result[0].values.length > 0) {
        this.currentUserId = result[0].values[0][0];
        return {
          success: true,
          userId: this.currentUserId,
          login: result[0].values[0][1]
        };
      }
      return {success: false, error: 'Неверный логин или пароль'};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  // Выход из аккаунта
  logout() {
    this.currentUserId = null;
  }

  // Проверка, авторизован ли пользователь
  isLoggedIn() {
    return this.currentUserId !== null;
  }

  // Получение текущего пользователя
  getCurrentUserId() {
    return this.currentUserId;
  }

  // ====================== КРИТЕРИИ ======================
  saveCriteria(criteria) {
    if (!this.currentUserId) return false;

    this.db.run(
        `UPDATE criteria SET 
                formula = ?, damageMax = ?, probMax = ?, 
                priorityMax = ?, riskAppetite = ?, costPerPoint = ?
             WHERE user_id = ?`,
        [
          criteria.formula, criteria.damageMax, criteria.probMax,
          criteria.priorityMax, criteria.riskAppetite, criteria.costPerPoint,
          this.currentUserId
        ]);

    this.saveToLocalStorage();
    return true;
  }

  getCriteria() {
    if (!this.currentUserId) return null;

    const result = this.db.exec(
        'SELECT * FROM criteria WHERE user_id = ?', [this.currentUserId]);

    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        formula: row[2],
        damageMax: row[3],
        probMax: row[4],
        priorityMax: row[5],
        riskAppetite: row[6],
        costPerPoint: row[7]
      };
    }
    return null;
  }

  // ====================== АКТИВЫ ======================
  addAsset(asset) {
    if (!this.currentUserId) return null;

    this.db.run(
        'INSERT INTO assets (user_id, name, value, priority) VALUES (?, ?, ?, ?)',
        [this.currentUserId, asset.name, asset.value, asset.priority]);

    const result = this.db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];

    this.saveToLocalStorage();
    return {...asset, id, userId: this.currentUserId};
  }

  getAssets() {
    if (!this.currentUserId) return [];

    const result = this.db.exec(
        'SELECT id, name, value, priority FROM assets WHERE user_id = ?',
        [this.currentUserId]);

    if (result.length === 0) return [];

    return result[0].values.map(
        row => ({id: row[0], name: row[1], value: row[2], priority: row[3]}));
  }

  updateAsset(id, updates) {
    if (!this.currentUserId) return false;

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.value !== undefined) {
      fields.push('value = ?');
      values.push(updates.value);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }

    if (fields.length === 0) return false;

    values.push(id);
    values.push(this.currentUserId);

    this.db.run(
        `UPDATE assets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values);

    this.saveToLocalStorage();
    return true;
  }

  deleteAsset(id) {
    if (!this.currentUserId) return false;

    // Удаляем связанные риски
    this.db.run(
        'DELETE FROM risks WHERE asset_id = ? AND user_id = ?',
        [id, this.currentUserId]);

    this.db.run(
        'DELETE FROM assets WHERE id = ? AND user_id = ?',
        [id, this.currentUserId]);

    this.saveToLocalStorage();
    return true;
  }

  // ====================== РИСКИ ======================
  addRisk(risk) {
    if (!this.currentUserId) return null;

    this.db.run(
        `INSERT INTO risks (user_id, asset_id, threat, vulnerability, 
             damage, probability, priority, score) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          this.currentUserId, risk.assetId, risk.threat, risk.vulnerability,
          risk.damage, risk.probability, risk.priority, risk.score
        ]);

    const result = this.db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];

    this.saveToLocalStorage();
    return {...risk, id, userId: this.currentUserId};
  }

  getRisks() {
    if (!this.currentUserId) return [];

    const result = this.db.exec(
        `SELECT id, asset_id, threat, vulnerability, damage, probability, 
                    priority, score, residualScore, measure_id, reduceDamage, reduceProb 
             FROM risks WHERE user_id = ?`,
        [this.currentUserId]);

    if (result.length === 0) return [];

    return result[0].values.map(row => ({
                                  id: row[0],
                                  assetId: row[1],
                                  threat: row[2],
                                  vulnerability: row[3],
                                  damage: row[4],
                                  probability: row[5],
                                  priority: row[6],
                                  score: row[7],
                                  residualScore: row[8],
                                  measureId: row[9],
                                  reduceDamage: row[10],
                                  reduceProb: row[11]
                                }));
  }

  updateRisk(id, updates) {
    if (!this.currentUserId) return false;

    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    });

    values.push(id);
    values.push(this.currentUserId);

    this.db.run(
        `UPDATE risks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values);

    this.saveToLocalStorage();
    return true;
  }

  deleteRisk(id) {
    if (!this.currentUserId) return false;

    this.db.run(
        'DELETE FROM risks WHERE id = ? AND user_id = ?',
        [id, this.currentUserId]);

    this.saveToLocalStorage();
    return true;
  }

  // ====================== МЕРЫ ======================
  addMeasure(measure) {
    if (!this.currentUserId) return null;

    this.db.run(
        `INSERT INTO measures (user_id, name, cost, reduceDamage, reduceProb) 
             VALUES (?, ?, ?, ?, ?)`,
        [
          this.currentUserId, measure.name, measure.cost, measure.reduceDamage,
          measure.reduceProb
        ]);

    const result = this.db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];

    this.saveToLocalStorage();
    return {...measure, id, userId: this.currentUserId};
  }

  getMeasures() {
    if (!this.currentUserId) return [];

    const result = this.db.exec(
        `SELECT id, name, cost, reduceDamage, reduceProb, linkedRiskId 
             FROM measures WHERE user_id = ?`,
        [this.currentUserId]);

    if (result.length === 0) return [];

    return result[0].values.map(row => ({
                                  id: row[0],
                                  name: row[1],
                                  cost: row[2],
                                  reduceDamage: row[3],
                                  reduceProb: row[4],
                                  linkedRiskId: row[5]
                                }));
  }

  updateMeasure(id, updates) {
    if (!this.currentUserId) return false;

    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    });

    values.push(id);
    values.push(this.currentUserId);

    this.db.run(
        `UPDATE measures SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values);

    this.saveToLocalStorage();
    return true;
  }

  deleteMeasure(id) {
    if (!this.currentUserId) return false;

    // Отвязываем меру от рисков
    this.db.run(
        `UPDATE risks SET measure_id = NULL, reduceDamage = 0, 
                    reduceProb = 0, residualScore = NULL 
             WHERE measure_id = ? AND user_id = ?`,
        [id, this.currentUserId]);

    this.db.run(
        'DELETE FROM measures WHERE id = ? AND user_id = ?',
        [id, this.currentUserId]);

    this.saveToLocalStorage();
    return true;
  }

  // ====================== СБРОС ДАННЫХ ПОЛЬЗОВАТЕЛЯ ======================
  resetUserData() {
    if (!this.currentUserId) return false;

    // Удаляем все данные пользователя кроме учётной записи
    this.db.run('DELETE FROM risks WHERE user_id = ?', [this.currentUserId]);
    this.db.run('DELETE FROM measures WHERE user_id = ?', [this.currentUserId]);
    this.db.run('DELETE FROM assets WHERE user_id = ?', [this.currentUserId]);

    // Сбрасываем критерии к значениям по умолчанию
    this.db.run(
        `UPDATE criteria SET 
                formula = 'damage * probability * priority',
                damageMax = 4, probMax = 4, priorityMax = 4,
                riskAppetite = 12, costPerPoint = 50000
             WHERE user_id = ?`,
        [this.currentUserId]);

    this.saveToLocalStorage();
    return true;
  }

  // ====================== УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ======================
  deleteUser(userId) {
    this.db.run('DELETE FROM risks WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM measures WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM assets WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM criteria WHERE user_id = ?', [userId]);
    this.db.run('DELETE FROM users WHERE id = ?', [userId]);

    this.saveToLocalStorage();
    return true;
  }

  // Экспорт БД для отладки
  exportDb() {
    if (!this.db) return null;
    const data = this.db.export();
    return Array.from(data);
  }
}

// Глобальный экземпляр базы данных
const db = new SecurityDatabase();