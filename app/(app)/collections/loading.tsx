export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Page header skeleton */}
      <div className="px-6 py-5 border-b border-border flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-muted animate-pulse rounded-md" />
          <div className="h-3.5 w-64 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Filter bar skeleton */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-8 w-40 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Table rows skeleton */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="w-9 h-9 bg-muted animate-pulse rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-muted animate-pulse rounded w-48" style={{ opacity: 1 - i * 0.08 }} />
              <div className="h-3 bg-muted animate-pulse rounded w-32" style={{ opacity: 0.6 - i * 0.05 }} />
            </div>
            <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
