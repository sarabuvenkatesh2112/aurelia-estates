export default function Loading() {
  return (
    <main className="office-gate" aria-busy="true">
      <p className="office-eyebrow">AURELIA OFFICE</p>
      <h1>A considered view.</h1>
      <output>Preparing your workspace…</output>
      <div className="office-skeleton" />
      <div className="office-skeleton" />
    </main>
  );
}
