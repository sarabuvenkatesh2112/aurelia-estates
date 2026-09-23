import Link from 'next/link';
import { AuthForm } from '@/components/account/auth-form';
import { safeReturnPath } from '@/lib/validation/customer';
import { currentCustomer } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
export const metadata = { title: 'Create your account | Aurelia Estates' };
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
            Make room for <em>what comes next.</em>
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
        <p className="eyebrow">A PERSONAL INTRODUCTION</p>
        <h2>Begin your collection.</h2>
        <p>Save the homes that speak to you, and plan your first visit.</p>
        <AuthForm signup={true} returnTo={returnTo} />
      </section>
    </main>
  );
}
