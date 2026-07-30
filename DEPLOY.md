# Deploy: Frontend на Vercel

Frontend — Vite + React SPA. На Vercel деплоится **только** `frontend/`.  
Backend (FastAPI) нужно поднять отдельно (Render / Railway / VPS) и указать его URL в `VITE_API_URL`.

## 1. Подготовьте backend URL

Пример:

```text
https://car-damage-detector-api.onrender.com
```

Без завершающего `/`.

На backend в `CORS_ORIGINS` добавьте домен Vercel, например:

```env
CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

## 2. Залейте репозиторий на GitHub

Если ещё не сделано:

```bash
git remote add origin https://github.com/<USER>/car-damage-detector.git
git push -u origin main
```

## 3. Импорт в Vercel через GitHub

1. Откройте [vercel.com/new](https://vercel.com/new)
2. **Import** репозиторий `car-damage-detector`
3. Project settings:

| Setting | Value |
|---------|--------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

4. **Environment Variables** (Production / Preview):

| Name | Value | Notes |
|------|--------|--------|
| `VITE_API_URL` | `https://<your-backend-host>` | Обязательно для прод. Без этого UI ходит на тот же origin и API не найдёт. |
| `VITE_API_KEY` | (optional) | Если на backend задан `API_KEY` — тот же ключ сюда для повышенного rate limit |

> Важно: переменные `VITE_*` вшиваются **на этапе build**. После смены `VITE_API_URL` сделайте Redeploy.

5. Deploy.

## 4. Проверка после деплоя

1. Откройте `https://your-app.vercel.app`
2. Бейдж **API online** должен быть зелёным (запрос на `{VITE_API_URL}/health`)
3. Загрузите JPG/PNG → Detect
4. История: `/history?id=…&before=…&after=…`

## 5. SPA routing

В `frontend/vercel.json` уже есть rewrite на `index.html`, чтобы `/history` работал при прямом заходе.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 6. Локальная проверка «как на Vercel»

```bash
cd frontend
cp .env.example .env
# .env:
# VITE_API_URL=http://localhost:8000
npm run build && npm run preview
```

Если `VITE_API_URL` пустой, в `npm run dev` работает Vite proxy (`/api`, `/health` → `:8000`).  
На Vercel proxy нет — нужен полный `VITE_API_URL`.

## 7. Частые ошибки

| Симптом | Причина | Фикс |
|---------|---------|------|
| API offline / network error | Не задан или неверный `VITE_API_URL` | Env + Redeploy |
| CORS error в консоли | Backend не разрешил origin Vercel | Обновить `CORS_ORIGINS` |
| `/history` 404 | Нет rewrite | Проверить `vercel.json` |
| Старый API URL | Env изменили, билд старый | Redeploy |

## Пример CLI (опционально)

```bash
npm i -g vercel
cd frontend
vercel link
vercel env add VITE_API_URL
vercel --prod
```
