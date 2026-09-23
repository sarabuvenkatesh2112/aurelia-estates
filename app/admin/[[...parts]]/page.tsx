import { redirect, notFound } from 'next/navigation';
import { requireStaff } from '@/lib/admin/auth';
import { adminRead } from '@/lib/admin/repository';
import { PublicError } from '@/lib/http';
import {
  AdminWorkspace,
  type AdminPayload,
} from '@/components/admin/workspace';
import Link from 'next/link';
const resources = [
  'dashboard',
  'leads',
  'customers',
  'enquiries',
  'visits',
  'follow-ups',
  'inventory',
  'analytics',
  'staff',
  'audit',
];
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ parts?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { parts = [] } = await params;
  const [resource = 'dashboard', id] = parts;
  let staff;
  try {
    staff = await requireStaff();
  } catch (e) {
    if (e instanceof PublicError && e.status === 401)
      redirect('/admin/sign-in/');
    if (e instanceof PublicError && e.status === 403)
      return (
        <main className="office-gate">
          <span className="office-eyebrow">AURELIA / PRIVATE OFFICE</span>
          <h1>Access is reserved.</h1>
          <p>This account does not have active staff access.</p>
          <Link href="/account/">Return to your account</Link>
          <Link href="/admin/sign-in/">Use a staff account</Link>
        </main>
      );
    throw e;
  }
  if (parts.length > 2 || !resources.includes(resource)) notFound();
  const query = Object.fromEntries(
    Object.entries(await searchParams).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  );
  let data;
  try {
    data = await adminRead(resource, id, query);
  } catch (e) {
    if (e instanceof PublicError && e.status === 404) notFound();
    if (e instanceof PublicError && e.status === 403)
      return (
        <main className="office-gate">
          <h1>Access is reserved.</h1>
          <p>Your role does not include this area.</p>
          <Link href="/admin/">Return to the office</Link>
        </main>
      );
    throw e;
  }
  return (
    <AdminWorkspace
      staff={{ id: staff.id, name: staff.name, role: staff.role }}
      resource={resource}
      id={id}
      query={query}
      data={JSON.parse(JSON.stringify(data)) as AdminPayload}
    />
  );
}
