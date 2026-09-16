# Задача и правила 
Проведи миграцию клиентского приложения "ИБ-Эффект" (Calculatrade) на клиент-серверную архитектуру с полным сохранением текущего функционала и UI/UX.

## Правила работы:
1. Разбей работу на логические этапы. После завершения каждого важного этапа останавливайся, жди моей команды "далее" или сразу коммить изменения.
2. Сообщения коммитов пиши на русском языке в стиле Conventional Commits (например: `feat(server): добавлена авторизация по JWT`, `refactor(client): замена sql.js на axios`). Не указывай себя в соавторах, так это может вызвать предвзятое отношение к коду.
3. Используй подход Monorepo: корневая папка, внутри `server/` (Node.js) и `client/` (Frontend).

# Технологический стек
- **Backend:** Node.js, Express.js, Prisma ORM (или pg напрямую), bcrypt, jsonwebtoken, cors, dotenv.
- **Database:** PostgreSQL (локально, желательно добавить `docker-compose.yml` для быстрого поднятия БД).
- **Authentication:** JWT (Access Token) + bcrypt для хеширования паролей.
- **Frontend:** Alpine.js (без изменений логики UI), Axios для API-коммуникации. Удалить зависимости `sql.js` и весь код, связанный с `localStorage` для хранения БД.

# Архитектурные решения и нюансы
1. **Бизнес-логика (Математика):** Расчеты (Риск, Остаточный риск, ROSI, Экономический эффект) ОСТАВЛЯЕМ на фронтенде для мгновенной реактивности UI. Бэкенд только хранит "сырые" данные (ущерб, вероятность, приоритет, стоимость) и отдает их.
2. **Состояние Frontend:** Все вызовы `db.xxx()` в Alpine.js компонентах нужно заменить на асинхронные вызовы API (`await api.get...`). Обязательно добавь состояния `isLoading` и обработку ошибок (через существующий `showNotification`).
3. **Миграция данных:** Так как мы меняем БД с клиентской SQLite на серверную PostgreSQL, старые данные из localStorage НЕ мигрируем, пользователям нужно будет зарегистрироваться заново.

# Схема PostgreSQL (Ожидаемая структура)
Используй эту логику для создания таблиц:
- `users`: id, login (unique), password_hash, created_at.
- `criteria`: id, user_id (unique, FK), formula, damage_max, prob_max, priority_max, risk_appetite, cost_per_point.
- `assets`: id, user_id (FK), name, value, priority, created_at.
- `risks`: id, user_id (FK), asset_id (FK), threat, vulnerability, damage, probability, priority, score, residual_score, measure_id (FK, nullable), reduce_damage, reduce_prob, created_at.
- `measures`: id, user_id (FK), name, cost, reduce_damage, reduce_prob, linked_risk_id (FK, nullable), created_at.

# REST API Endpoints
Все эндпоинты (кроме `/api/auth/*`) должны быть защищены JWT-мидлваром, который проверяет токен и подставляет `user_id` из токена в запросы к БД (чтобы пользователи не видели чужие данные).

## Authentication
POST   /api/auth/register      # Регистрация (хэширование bcrypt)
POST   /api/auth/login         # Вход (возвращает JWT)
POST   /api/auth/logout        # Выход (на фронте просто удаляем токен)
POST   /api/auth/refresh       # Обновление токена (опционально, можно использовать только Access)

## Criteria
GET    /api/criteria           # Получить критерии текущего пользователя
PUT    /api/criteria           # Обновить критерии (upsert)

## Assets
GET    /api/assets             # Получить все активы пользователя
POST   /api/assets             # Создать актив
PUT    /api/assets/:id         # Обновить актив
DELETE /api/assets/:id         # Удалить актив (каскадно удалить связанные риски)

## Risks
GET    /api/risks              # Получить все риски пользователя
POST   /api/risks              # Создать риск
PUT    /api/risks/:id          # Обновить риск
DELETE /api/risks/:id          # Удалить риск

## Measures
GET    /api/measures           # Получить все меры пользователя
POST   /api/measures           # Создать меру
PUT    /api/measures/:id       # Обновить меру
DELETE /api/measures/:id       # Удалить меру (каскадно отвязать от рисков)
POST   /api/measures/:id/link-risk   # Привязать риск к мере (тело: { riskId })
DELETE /api/measures/:id/link-risk   # Отвязать риск от меры

# План выполнения (Этапы)
**Этап 1:** Инициализация проекта (структура папок, package.json, docker-compose для Postgres, настройка Express и CORS).
**Этап 2:** Настройка БД (Prisma/SQL скрипты) и реализация Auth API (register, login, JWT middleware).
**Этап 3:** Реализация REST API для Criteria, Assets, Risks, Measures с учетом изоляции по `user_id`.
**Этап 4:** Рефакторинг Frontend. Создание слоя API (`api.js`), удаление `database.js` и `sql.js`, переписывание Alpine.js компонентов на работу с Axios.
**Этап 5:** Финальное тестирование, чистка кода, обновление README.md с инструкциями по запуску.

Начни с Этапа 1. Предложи структуру файлов и напиши базовый код для `server/index.js` и `docker-compose.yml`.
