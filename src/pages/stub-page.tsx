export function StubPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-bg-l2 rounded-2xl border border-a10-b p-8">
        <p className="text-secondary-t text-sm">
          This page is a placeholder for{" "}
          <strong className="text-primary-t">{title}</strong>.
        </p>
        <p className="text-tertiary-t text-xs mt-2">
          Content will be implemented in a future iteration.
        </p>
      </div>
    </div>
  );
}
