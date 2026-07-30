import { NavLink, Outlet } from 'react-router-dom'
import { History, ScanSearch } from 'lucide-react'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-ink text-white'
      : 'text-ink-muted hover:bg-white hover:text-ink',
  ].join(' ')

export function Layout() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Computer vision
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Car Damage Detector
          </h1>
        </div>
        <nav className="flex items-center gap-1 rounded-full border border-line bg-surface-raised/80 p-1 backdrop-blur">
          <NavLink to="/" end className={linkClass}>
            <ScanSearch className="h-4 w-4" />
            Детекция
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            <History className="h-4 w-4" />
            История
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
