export default function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-surface border border-background-tertiary rounded-xl p-4 sm:p-6 animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-background-secondary rounded"
          style={{ width: i === 0 ? '60%' : i === lines - 1 ? '40%' : '100%' }}
        />
      ))}
    </div>
  );
}
