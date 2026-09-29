import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { readLocationEditor } from '@/lib/location/admin';
import { LocationEditor } from '@/components/location/location-editor';
import { PublicError } from '@/lib/http';
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let data;
  try {
    data = await readLocationEditor((await params).slug);
  } catch (e) {
    if (e instanceof PublicError && e.status === 401)
      redirect('/admin/sign-in/');
    if (e instanceof PublicError && e.status === 404) notFound();
    if (e instanceof PublicError && e.status === 403)
      return (
        <main className="office-gate">
          <h1>Access is reserved.</h1>
          <Link href="/admin/">Return to the office</Link>
        </main>
      );
    throw e;
  }
  return (
    <main className="location-office">
      <Link href="/admin/locations/">← Project locations</Link>
      <h1>{data.name}</h1>
      <p>
        {data.locality}, {data.city}
      </p>
      <LocationEditor slug={data.slug} initial={data.edit} />
    </main>
  );
}
