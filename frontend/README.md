# Frontend — Car Damage Detector

React + TypeScript + Tailwind (Vite).

## Scripts

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve dist locally
npm run lint
```

## Env

Скопируйте `.env.example` → `.env`:

```env
VITE_API_URL=https://your-backend.example.com
VITE_API_KEY=
VITE_ANALYTICS_ENABLED=true
```

В `npm run dev` при пустом `VITE_API_URL` работает proxy на `localhost:8000`.

## Vercel

Конфиг: [`vercel.json`](./vercel.json)  
Инструкция: [../DEPLOY.md](../DEPLOY.md)

Root Directory в Vercel UI: **`frontend`**.

## Routes

| Path | Page |
|------|------|
| `/` | Детекция |
| `/history` | История + сравнение до/после |
| `/about` | О проекте |
