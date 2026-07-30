export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-line/60 ${className}`}
      aria-hidden
    />
  )
}

export function AnalysisSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Анализ изображения">
      <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
