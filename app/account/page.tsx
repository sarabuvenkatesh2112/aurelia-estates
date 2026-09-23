import { redirect } from 'next/navigation';
import { currentCustomer } from '@/lib/auth/server';
import { customerOperation } from '@/lib/repositories/customerRepository';
import { homepageCollection } from '@/lib/services/projectService';
import { PlatformShell } from '@/components/platform/platform-shell';
import {
  AccountPortal,
  type AccountData,
} from '@/components/account/account-portal';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your private collection | Aurelia Estates' };
export default async function Page() {
  if (!(await currentCustomer())) redirect('/sign-in?returnTo=%2Faccount');
  const [account, home] = await Promise.all([
    customerOperation('GET', [], undefined),
    homepageCollection(),
  ]);
  return (
    <PlatformShell properties={home.properties}>
      <AccountPortal
        initial={JSON.parse(JSON.stringify(account)) as AccountData}
      />
    </PlatformShell>
  );
}
