import Link from 'next/link';
export default function Page() {
  return (
    <main className="client-legal">
      <Link className="platform-brand" href="/">
        AURELIA ESTATES
      </Link>
      <p className="eyebrow">THE PRIVATE COLLECTION</p>
      <h1>Your privacy.</h1>
      <p>
        Your account profile, securely hashed password, sessions, shortlists,
        saved searches and submitted visit/enquiry details are stored in Neon
        PostgreSQL. A necessary HttpOnly cookie maintains your session.
        Authentication rate-limit records and session device metadata support
        account security. Anonymous property interaction events remain separate.
        Passwords are never stored as plain text.
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
