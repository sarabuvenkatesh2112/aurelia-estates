import Link from 'next/link';
import { AuthForm } from '@/components/account/auth-form';
import { safeReturnPath } from '@/lib/validation/customer';
import { currentCustomer } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
export const metadata = { title: 'Sign in | Aurelia Estates' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnPath((await searchParams).returnTo);
  if (await currentCustomer()) redirect(returnTo);
  return (
    <main className="auth-page">
      <aside className="auth-editorial">
        <Link href="/" className="platform-brand">
          AURELIA<small>ESTATES</small>
        </Link>
        <div>
          <p className="eyebrow">THE PRIVATE COLLECTION</p>
          <h1>
            A place to return <em>to possibility.</em>
          </h1>
          <p>Your considered addresses. Your next chapter.</p>
        </div>
        <span className="fine-print">
          A fictional collection, thoughtfully made.
        </span>
      </aside>
      <section className="auth-content">
        <Link href="/residences" className="text-link">
          ← Back to the collection
        </Link>
        <p className="eyebrow">WELCOME BACK</p>
        <h2>Your private Aurelia.</h2>
        <p>The residences you love, all in one considered space.</p>
        <AuthForm signup={false} returnTo={returnTo} />
      </section>
    </main>
  );
}
