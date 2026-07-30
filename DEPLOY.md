# Deploy: Frontend на Vercel

Frontend — Vite + React SPA. На Vercel деплоится **только** `frontend/`.  
Backend (FastAPI) — отдельно (Render / Railway / VPS), URL задаётся в `VITE_API_URL`.

## 1. Backend URL

```text
https://car-damage-detector-api.onrender.com
```

Без `/` в конце.

```env
CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

## 2. Vercel ← GitHub

1. [vercel.com/new](https://vercel.com/new) → Import repo
2. Settings:

| Setting | Value |
|---------|--------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

3. Environment Variables:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://<backend-host>` |
| `VITE_API_KEY` | optional |
| `VITE_ANALYTICS_ENABLED` | `true` (default) |

`VITE_*` вшиваются на **build** — после смены URL нужен Redeploy.

4. Deploy.

## 3. Проверка

1. Сайт открывается, `/about` и `/history` не дают 404
2. Бейдж **API online** зелёный
3. Upload → Detect → PDF / Share
4. В Vercel Dashboard → Analytics видны pageviews (после первых визитов)

## 4. `vercel.json`

В `frontend/vercel.json`:

- SPA rewrites (кроме `/assets/*`)
- cache для hashed assets
- security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)

## 5. Локально «как прод»

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:8000
npm install
npm run build && npm run preview
```

## 6. Частые ошибки

| Симптом | Фикс |
|---------|------|
| API offline | `VITE_API_URL` + Redeploy |
| CORS | добавить Vercel origin в `CORS_ORIGINS` |
| `/history` 404 | проверить `vercel.json` rewrites |
| Analytics пустые | подождать / убедиться что деплой на Vercel |

## CLI

```bash
cd frontend
npx vercel link
npx vercel env add VITE_API_URL
npx vercel --prod
```
