export default function AdminLoading() {
  return <div className="animate-pulse" aria-label="Memuat halaman">
    <div className="h-3 w-28 rounded-full bg-primary/15" />
    <div className="mt-3 h-9 w-64 max-w-full rounded-xl bg-primary/10" />
    <div className="mt-3 h-4 w-96 max-w-full rounded-lg bg-primary/10" />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-3xl border bg-white/80" />)}
    </div>
    <div className="mt-6 h-72 rounded-3xl border bg-white/80" />
  </div>;
}
