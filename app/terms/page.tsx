import Link from 'next/link';
export default function Page() {
  return (
    <main className="client-legal">
      <Link className="platform-brand" href="/">
        AURELIA ESTATES
      </Link>
      <p className="eyebrow">THE PRIVATE COLLECTION</p>
      <h1>A considered understanding.</h1>
      <p>
        Aurelia Estates is a fictional portfolio platform. Prices, properties,
        inventory and imagery are illustrative. A visit submission records a
        preferred appointment request; availability is not confirmed and no sale
        or payment is involved. Use only details you are authorized to provide.
      </p>
      <p>
        Account email is not verified in this phase. Email changes, password
        recovery and messaging are not offered. Do not use this local portfolio
        for real property transactions or submit sensitive personal information.
      </p>
      <Link className="text-link" href="/sign-up">
        Return to registration ?
      </Link>
    </main>
  );
}
