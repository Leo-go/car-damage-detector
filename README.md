# Car Damage Detector

CV-система для детекции повреждений автомобилей по фото (React + FastAPI).

## Структура

```
car-damage-detector/
├── frontend/     # React + TypeScript + Tailwind (Vite) → Vercel
├── backend/      # FastAPI + OpenCV / YOLO / Roboflow / HF → Render/Railway
├── DEPLOY.md     # Инструкция деплоя frontend на Vercel
└── README.md
```

## Быстрый старт (WSL)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# для local+proxy можно оставить VITE_API_URL пустым
npm run dev
```

UI: http://localhost:5173

### Backend

```bash
cd backend
source .venv/bin/activate   # или: uv venv .venv && source .venv/bin/activate
uv pip install fastapi==0.109.0 uvicorn==0.27.0 opencv-python-headless==4.9.0.80 \
  pillow==10.2.0 python-multipart==0.0.6 pydantic-settings==2.1.0 python-dotenv==1.0.1 numpy==1.26.4
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs: http://localhost:8000/docs · Health: http://localhost:8000/health

## Frontend features

- Drag & drop upload (`react-dropzone`) + progress bar
- Bounding boxes с цветами: scratch=жёлтый, dent=оранжевый, broken=красный
- PDF-отчёт (`jspdf`), toast-уведомления
- История в `localStorage` + сравнение **до/после**
- Share-ссылки: `/history?id=…&before=…&after=…` (автозагрузка сравнения)
- Axios + retry

## Deploy

См. подробный гайд: **[DEPLOY.md](./DEPLOY.md)**

Кратко для Vercel:

1. Import GitHub repo
2. Root Directory = `frontend`
3. Env: `VITE_API_URL=https://your-backend.example.com`
4. На backend добавьте Vercel origin в `CORS_ORIGINS`

## API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | Статус API |
| POST | `/api/detect` | Детекция по фото |
| POST | `/api/report` | Текстовый отчёт |

## Лицензия

MIT (или уточните у владельца репозитория).
