# Car Damage Detector

CV-система для детекции повреждений автомобилей по фото.

**Live demo (Vercel):** после деплоя frontend · **API** — отдельно на Render/Railway.

## Возможности

- Загрузка фото (drag & drop) + progress bar
- Детекция: царапины / вмятины / разбитые элементы
- Bounding boxes, severity, оценка ремонта
- PDF-отчёт и share-ссылки с сравнением до/после
- История в `localStorage`
- Страница [`/about`](./frontend/src/pages/AboutPage.tsx)
- Analytics (Vercel Analytics + Speed Insights, optional)

## Структура

```
car-damage-detector/
├── frontend/              # React + TS + Tailwind → Vercel
├── backend/               # FastAPI + OpenCV/YOLO → Render/Railway
├── .github/workflows/ci.yml
├── DEPLOY.md
└── README.md
```

## Быстрый старт

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=   # пусто = Vite proxy на localhost:8000
npm run dev
```

Откройте http://localhost:5173

### Backend

```bash
cd backend
source .venv/bin/activate
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment (frontend)

| Variable | Описание |
|----------|----------|
| `VITE_API_URL` | Базовый URL backend без `/` (обязателен на Vercel) |
| `VITE_API_KEY` | Опционально, если на API включён ключ |
| `VITE_ANALYTICS_ENABLED` | `true`/`false` — Vercel Analytics |

## Deploy на Vercel

Полный гайд: **[DEPLOY.md](./DEPLOY.md)**

Кратко:

1. Import GitHub repo в Vercel
2. Root Directory = `frontend`
3. Env: `VITE_API_URL=https://your-api.example.com`
4. На backend: `CORS_ORIGINS=...,https://your-app.vercel.app`

## CI

GitHub Actions (`.github/workflows/ci.yml`):

- frontend: `npm ci` + `npm run build`
- backend: install deps + import check

## API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | Health + статус модели |
| POST | `/api/detect` | Детекция |
| POST | `/api/report` | Текстовый отчёт |

## License

MIT
