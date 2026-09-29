import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, permit } from '@/lib/admin/auth';
import { PublicError } from '@/lib/http';
import { getDb } from '@/lib/db/prisma';
import '@/components/location/editor.css';
export default async function Page() {
  try {
    permit(await requireStaff(), 'inventory');
  } catch (e) {
    if (e instanceof PublicError && e.status === 401)
      redirect('/admin/sign-in/');
    if (e instanceof PublicError && e.status === 403)
      return (
        <main className="office-gate">
          <h1>Access is reserved.</h1>
          <Link href="/admin/">Return to the office</Link>
        </main>
      );
    throw e;
  }
  const projects = await getDb().project.findMany({
    where: { deletedAt: null },
    select: {
      slug: true,
      name: true,
      status: true,
      location: { select: { city: true, locality: true } },
    },
    orderBy: { name: 'asc' },
    take: 100,
  });
  return (
    <main className="location-office">
      <Link href="/admin/">← Private office</Link>
      <p className="office-eyebrow">LOCATION INTELLIGENCE</p>
      <h1>Places, with provenance.</h1>
      <p>
        Maintain public site information and nearby context. Archived records
        remain excluded from the public catalogue.
      </p>
      <ul>
        {projects.map((p) => (
          <li key={p.slug}>
            <Link href={`/admin/locations/${p.slug}/`}>{p.name}</Link>
            <p>
              {p.location.locality}, {p.location.city} · {p.status}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
