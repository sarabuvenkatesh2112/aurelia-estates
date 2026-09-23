export default function Loading() {
  return (
    <main className="platform-loading" aria-busy="true">
      <p className="eyebrow">AURELIA ESTATES</p>
      <h1>A considered collection.</h1>
      <div className="catalog-skeleton" />
      <span>Preparing your view…</span>
    </main>
  );
}
