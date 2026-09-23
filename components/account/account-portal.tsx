'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormField } from './form-field';
import { SaveResidence } from './save-controls';
import { useCustomer, type Customer } from './customer-context';
import { profileSchema, savedSearchSchema } from '@/lib/validation/customer';
import { indiaDate } from '@/lib/validation/forms';
type Project = {
  id: string;
  name: string;
  slug: string;
  media: { url: string }[];
  location: { city: string; locality: string };
};
type Visit = {
  id: string;
  reference: string | null;
  preferredDate: string;
  preferredTime: string;
  status: string;
  createdAt: string;
  project: Project;
  unit: { unitNumber: string } | null;
  name: string;
};
export type AccountData = {
  user: Customer;
  favorites: { id: string; projectId: string; project: Project }[];
  searches: { id: string; name: string; url: string }[];
  visits: Visit[];
  enquiries: {
    id: string;
    reference: string | null;
    createdAt: string;
    message: string;
    project: Project;
  }[];
};
const displayDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
const statuses: Record<string, string> = {
  REQUESTED: 'Requested',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'Cancelled',
};
export function AccountPortal({ initial }: { initial: AccountData }) {
  const [data, setData] = useState(initial),
    [profile, setProfile] = useState({
      name: initial.user.name,
      phone: initial.user.phone || '',
    }),
    [fields, setFields] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState('');
  const busy = useRef(false),
    { refresh, favorites } = useCustomer(),
    router = useRouter();
  async function mutate(
    path: string,
    method: string,
    body: unknown,
    label: string,
  ) {
    if (busy.current) return false;
    busy.current = true;
    setPending(label);
    setError('');
    setNotice('');
    try {
      const r = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error || 'Please try again.');
      const next = await fetch('/api/customer/', { cache: 'no-store' });
      if (!next.ok) throw Error('Please refresh your collection.');
      setData(await next.json());
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
      return false;
    } finally {
      busy.current = false;
      setPending('');
    }
  }
  function profileErrors() {
    const p = profileSchema.safeParse(profile);
    const issues: Record<string, string> = {};
    if (!p.success)
      for (const issue of p.error.issues)
        issues[String(issue.path[0])] = issue.message;
    return issues;
  }
  const today = indiaDate(),
    upcoming = data.visits.filter(
      (v) =>
        v.preferredDate.slice(0, 10) >= today &&
        !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(v.status),
    ),
    past = data.visits.filter((v) => !upcoming.includes(v));
  const visits = (items: Visit[]) =>
    items.length ? (
      <div className="account-grid">
        {items.map((v) => (
          <article className="account-card" key={v.id}>
            <span className="account-status">
              {statuses[v.status] || 'Requested'}
            </span>
            <h3>
              <Link href={'/residences/' + v.project.slug}>
                {v.project.name}
              </Link>
            </h3>
            <p>
              {v.unit ? 'Residence ' + v.unit.unitNumber + ' · ' : ''}
              {displayDate(v.preferredDate)}
              <br />
              {v.preferredTime} IST
            </p>
            <p>
              Reference: {v.reference || 'Legacy request'}
              <br />
              Submitted {displayDate(v.createdAt)}
            </p>
          </article>
        ))}
      </div>
    ) : (
      <p className="account-empty">
        Your next chapter is open.{' '}
        <Link href="/residences">Explore the collection ↗</Link>
      </p>
    );
  return (
    <main className="account-page">
      <div className="account-intro">
        <div>
          <p className="eyebrow">YOUR PRIVATE AURELIA</p>
          <h1>
            Welcome, <em>{data.user.name.split(' ')[0]}.</em>
          </h1>
          <p>
            A considered space for the places you love and the visits to come.
          </p>
        </div>
        <button
          className="text-link"
          disabled={!!pending}
          onClick={async () => {
            if (busy.current) return;
            busy.current = true;
            setPending('logout');
            try {
              const r = await fetch('/api/auth/sign-out/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              });
              if (!r.ok) throw Error('Unable to sign out. Please try again.');
              await refresh();
              router.replace('/sign-in');
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Please try again.');
            } finally {
              busy.current = false;
              setPending('');
            }
          }}
        >
          {pending === 'logout' ? 'Signing out…' : 'Sign out ↗'}
        </button>
      </div>
      <nav className="account-nav" aria-label="Private collection">
        <a href="#shortlist">Shortlist</a>
        <a href="#searches">Saved searches</a>
        <a href="#visits">Your visits</a>
        <a href="#enquiries">Enquiries</a>
        <a href="#profile">Profile</a>
      </nav>
      {error && (
        <p className="field-error account-alert" role="alert">
          {error}
        </p>
      )}
      {notice && <output className="account-alert">{notice}</output>}
      <section className="account-section" id="shortlist">
        <p className="eyebrow">THE HOMES THAT STAY WITH YOU</p>
        <h2>Your shortlist.</h2>
        {data.favorites.filter((f) => favorites.some((v) => v.id === f.id))
          .length ? (
          <div className="account-grid">
            {data.favorites
              .filter((f) => favorites.some((v) => v.id === f.id))
              .map((f, index) => (
                <article className="account-card" key={f.id}>
                  <Link href={'/residences/' + f.project.slug}>
                    <Image
                      src={f.project.media[0]?.url || '/images/exterior.webp'}
                      alt={f.project.name + ' architectural mood reference'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                      width={500}
                      height={320}
                    />
                    <p className="eyebrow">
                      {f.project.location.locality} / {f.project.location.city}
                    </p>
                    <h3>{f.project.name}</h3>
                  </Link>
                  <SaveResidence projectId={f.projectId} />
                </article>
              ))}
          </div>
        ) : (
          <p className="account-empty">
            There is room for something exceptional. Save residences as you
            explore the collection.
          </p>
        )}
      </section>
      <section className="account-section" id="searches">
        <p className="eyebrow">POSSIBILITIES, KEPT CLOSE</p>
        <h2>Saved searches.</h2>
        {data.searches.length ? (
          <div className="account-grid">
            {data.searches.map((s) => (
              <article className="account-card" key={s.id}>
                <h3>{s.name}</h3>
                <Link className="text-link" href={s.url}>
                  Open this selection ↗
                </Link>
                <details className="saved-search-editor">
                  <summary>Rename search</summary>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const input = savedSearchSchema
                        .pick({ name: true })
                        .safeParse({
                          name: new FormData(e.currentTarget).get('name'),
                        });
                      if (!input.success) {
                        setError(input.error.issues[0].message);
                        return;
                      }
                      if (
                        await mutate(
                          '/api/customer/saved-searches/' + s.id + '/',
                          'PATCH',
                          input.data,
                          s.id,
                        )
                      )
                        setNotice('Search name updated.');
                    }}
                  >
                    <label htmlFor={'rename-' + s.id}>Search name</label>
                    <input
                      id={'rename-' + s.id}
                      name="name"
                      defaultValue={s.name}
                      maxLength={60}
                    />
                    <button className="text-link" disabled={!!pending}>
                      Save name
                    </button>
                  </form>
                </details>
                <button
                  className="text-link"
                  disabled={!!pending}
                  onClick={() =>
                    void mutate(
                      '/api/customer/saved-searches/' + s.id + '/',
                      'DELETE',
                      {},
                      s.id,
                    )
                  }
                >
                  Remove search
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="account-empty">
            Keep a favourite combination of location, space and budget.{' '}
            <Link href="/residences">Create a search ↗</Link>
          </p>
        )}
      </section>
      <section className="account-section" id="visits">
        <p className="eyebrow">A PERSONAL INTRODUCTION</p>
        <h2>Upcoming visits.</h2>
        <p className="fine-print">
          Preferred dates are requests until explicitly confirmed. All times are
          India Standard Time.
        </p>
        {visits(upcoming)}
        <h3 className="history-heading">Visit history</h3>
        {visits(past)}
      </section>
      <section className="account-section" id="enquiries">
        <p className="eyebrow">OUR CONVERSATION</p>
        <h2>Your enquiries.</h2>
        {data.enquiries.length ? (
          <div className="account-grid">
            {data.enquiries.map((e) => (
              <article className="account-card" key={e.id}>
                <span className="account-status">Received</span>
                <h3>
                  <Link href={'/residences/' + e.project.slug}>
                    {e.project.name}
                  </Link>
                </h3>
                <p>{e.message || 'A personal introduction requested.'}</p>
                <p>
                  {displayDate(e.createdAt)}
                  <br />
                  {e.reference || 'Legacy request'}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="account-empty">
            Your conversations with Aurelia will appear here.
          </p>
        )}
      </section>
      <section className="account-section" id="profile">
        <p className="eyebrow">THE DETAILS THAT MAKE IT PERSONAL</p>
        <h2>Your profile.</h2>
        <form
          className="client-form profile-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = profileSchema.safeParse(profile);
            setFields(profileErrors());
            if (!parsed.success) return;
            if (
              await mutate(
                '/api/customer/profile/',
                'PATCH',
                parsed.data,
                'profile',
              )
            )
              setNotice('Your profile has been updated.');
          }}
        >
          <FormField
            label="Full name"
            name="name"
            autoComplete="name"
            value={profile.name}
            maxLength={60}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            onBlur={() => setFields({ ...fields, name: profileErrors().name })}
            error={fields.name}
          />
          <FormField
            label="Mobile number"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={profile.phone}
            maxLength={30}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            onBlur={() =>
              setFields({ ...fields, phone: profileErrors().phone })
            }
            error={fields.phone}
          />
          <FormField
            label="Account email"
            type="email"
            value={data.user.email}
            readOnly
            autoComplete="email"
          />
          <p className="fine-print">
            Email is read-only until a verified email-change service is
            available. Account email and phone have not been verified.
          </p>
          <button className="button dark" disabled={!!pending}>
            {pending === 'profile' ? 'Saving…' : 'Save profile ↗'}
          </button>
        </form>
      </section>
    </main>
  );
}
