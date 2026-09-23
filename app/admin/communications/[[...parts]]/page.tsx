import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/admin/auth';
import { communicationRead } from '@/lib/communications/service';
import { Communications } from '@/components/admin/communications';
import { PublicError } from '@/lib/http';
import './communications.css';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ parts?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { parts = [] } = await params;
  if (parts.length > 1) notFound();
  const query = Object.fromEntries(
    Object.entries(await searchParams).filter(
      (v): v is [string, string] => typeof v[1] === 'string' && v[1] !== '',
    ),
  );
  let staff,data,denied=false;
  try {
    staff = await requireStaff();
    data = await communicationRead(query, parts[0]);
  } catch (error) {
    if (error instanceof PublicError && error.status===401) redirect('/admin/sign-in/');
    if (error instanceof PublicError && error.status===404) notFound();
    if (error instanceof PublicError && error.status===403) denied=true;
    else throw error;
  }
  if(denied || !staff || !data)return <main className="office-gate"><h1>Access is reserved.</h1><Link href="/account/">Return to your account</Link></main>;
  return (
      <Communications
        key={parts[0] || 'list'}
        staff={{ id: staff.id, name: staff.name, role: staff.role }}
        id={parts[0]}
        query={query}
        data={JSON.parse(JSON.stringify(data))}
      />
    );
}
