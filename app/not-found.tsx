
import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="platform-loading">
      <p className="eyebrow">AURELIA ESTATES</p>
      <h1>A different address awaits.</h1>
      <p>This residence could not be found.</p>
      <Link prefetch={false} className="button dark" href="/residences">
        Explore the collection
      </Link>
    </main>
  );
}
