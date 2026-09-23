'use client';
import Link from 'next/link';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="platform-loading">
      <p className="eyebrow">AURELIA ESTATES</p>
      <h1>A moment, please.</h1>
      <p>The collection is temporarily unavailable.</p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
      <Link prefetch={false} href="/">Return home</Link>
    </main>
  );
}
