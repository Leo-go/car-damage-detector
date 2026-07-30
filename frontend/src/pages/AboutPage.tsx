import { Link } from 'react-router-dom'
import { Camera, Gauge, ShieldCheck, Workflow } from 'lucide-react'

const stack = [
  { title: 'Frontend', text: 'React, TypeScript, Tailwind, Vite' },
  { title: 'Backend', text: 'FastAPI, OpenCV / YOLOv8, SQLite' },
  { title: 'Deploy', text: 'Frontend → Vercel · API → Render / Railway' },
]

const steps = [
  {
    icon: Camera,
    title: 'Загрузка фото',
    text: 'Drag & drop или выбор файла. JPG/PNG до 10 MB.',
  },
  {
    icon: Workflow,
    title: 'CV-инференс',
    text: 'Детекция царапин, вмятин и разбитых элементов с bbox и confidence.',
  },
  {
    icon: Gauge,
    title: 'Оценка ущерба',
    text: 'Severity low/medium/high и ориентировочная стоимость ремонта.',
  },
  {
    icon: ShieldCheck,
    title: 'Отчёт',
    text: 'PDF, share-ссылка и история проверок с сравнением до/после.',
  },
]

export function AboutPage() {
  return (
    <div className="space-y-10">
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          About
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Car Damage Detector
        </h2>
        <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
          MVP-система компьютерного зрения для быстрой оценки повреждений
          автомобиля по фото. Подходит для демо страховым/сервисным сценариям:
          загрузка снимка → детекция → отчёт с оценкой стоимости.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="rounded-2xl border border-line bg-surface-raised/80 p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-surface-raised p-6 sm:p-8">
        <h3 className="font-display text-2xl font-semibold">Стек</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {stack.map((item) => (
            <li key={item.title} className="rounded-xl border border-line bg-white/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-ink">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl space-y-3 text-sm leading-relaxed text-ink-muted">
        <h3 className="font-display text-xl font-semibold text-ink">Ограничения MVP</h3>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Без fine-tuned car-damage весов backend может использовать OpenCV-эвристику —
            это demo-режим, не продакшен-точность.
          </li>
          <li>
            Оценка ремонта ориентировочная и не заменяет калькуляцию СТО.
          </li>
          <li>
            История хранится локально в браузере (localStorage); share-ссылки
            работают на том же устройстве/браузере.
          </li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
        >
          Запустить детекцию
        </Link>
        <Link
          to="/history"
          className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
        >
          Открыть историю
        </Link>
      </div>
    </div>
  )
}
