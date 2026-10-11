# ИБ-Эффект (Calculatrade)

Веб-приложение для оценки рисков информационной безопасности, расчета остаточных рисков после внедрения защитных мер и анализа экономической эффективности инвестиций в ИБ.

## Архитектура проекта

Проект переведён на monorepo-структуру:

- `server/` — Express.js API, PostgreSQL, JWT и Prisma
- `client/` — фронтенд с Alpine.js + Axios
- `docker-compose.yml` — локальная база данных PostgreSQL

## Быстрый старт

1. Установите зависимости:
   `npm install --workspaces --include-workspace-root`
2. Поднимите PostgreSQL:
   `docker compose up -d`
3. Сгенерируйте Prisma-клиент и примените схему:
   `npm --workspace server run db:generate`
   `npm --workspace server run db:push`
4. Запустите сервер:
   `npm run dev:server`
5. Запустите клиент:
   `npm run dev:client`

## Переменные окружения

Сервер использует файл `server/.env` на основе `server/.env.example`:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=dev_secret_change_me
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calculatrade?schema=public
```

Клиент использует `client/.env` (по желанию):

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## API

Основной API доступен на `http://localhost:4000/api`.

Protected endpoints требуют JWT в заголовке:

```http
Authorization: Bearer <token>
```

## Миграция данных

Старые данные из клиентской SQLite/localStorage не переносятся. После миграции пользователи должны зарегистрироваться заново.

## Расчёты

Расчеты базируются на методологии ГОСТ Р ИСО/МЭК 27000-2021 и стандартных формулах управления рисками.

### Основная формула риска

`Риск = Ущерб × Вероятность × Приоритет актива`

### Остаточный риск

`Остаточный риск = (Ущерб × (1 − Снижение ущерба / 100)) × (Вероятность × (1 − Снижение вероятности / 100)) × Приоритет`

### Экономическая эффективность

- `Ожидаемый ущерб = Баллы риска × Стоимость 1 балла риска`
- `Net ROSI = ((Снижение потерь − Стоимость меры) / Стоимость меры) × 100%`
- `Чистый эффект = (Ожидаемые потери до мер − Ожидаемые потери после мер) − Стоимость всех мер`
- `Экономический эффект = Сумма снижения ожидаемых потерь по всем рискам`

## Схема данных

Основные таблицы:

- `users`
- `criteria`
- `assets`
- `risks`
- `measures`

## Текущее состояние

Frontend обновлён на основе UX/UI V8: новая главная страница, единая навигация, исправленный layout/scroll и глубокий UX реестра рисков.

Рабочий frontend находится в `client/`: Vite + Alpine.js. Данные загружаются через серверный API-адаптер `client/src/database.js`, поэтому интерфейс работает поверх Express + Prisma + PostgreSQL без SQL.js. Математическая логика расчётов сохранена.

Для запуска используйте `npm run dev:server` и `npm run dev:client`.

