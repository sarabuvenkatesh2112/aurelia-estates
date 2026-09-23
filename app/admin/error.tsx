'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="office-gate">
      <h1>A moment, please.</h1>
      <p>
        The office could not load this view. Please check your filters or try
        again shortly.
      </p>
      <button onClick={reset}>Try again</button>
      <Link href="/admin/">Return to the office</Link>
    </main>
  );
}
