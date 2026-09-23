import { AdminSignIn } from '@/components/admin/sign-in';
import Link from 'next/link';
export default function Page() {
  return (
    <main className="office-signin">
      <section>
        <Link className="office-brand" href="/">
          AURELIA <span>ESTATES</span>
        </Link>
        <p className="office-eyebrow">THE PRIVATE OFFICE</p>
        <h1>
          Exceptional places.
          <br />
          <em>Considered relationships.</em>
        </h1>
        <p>A quieter workspace for the people behind Aurelia.</p>
      </section>
      <section>
        <p className="office-eyebrow">STAFF ACCESS</p>
        <h2>Welcome to the office.</h2>
        <p>
          Use your authorised Aurelia account. Staff access is granted privately
          by an administrator.
        </p>
        <AdminSignIn />
        <Link href="/">Return to Aurelia Estates</Link>
      </section>
    </main>
  );
}
