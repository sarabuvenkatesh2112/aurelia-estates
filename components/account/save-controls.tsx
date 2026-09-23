'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useCustomer } from './customer-context';
import type { SearchFilters } from '@/lib/validation/search';
import { savedSearchSchema } from '@/lib/validation/customer';
export function SaveResidence({ projectId }: { projectId: string }) {
  const { user, favorites, refresh, loading } = useCustomer(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [returnTo, setReturnTo] = useState('');
  const busy = useRef(false);
  const saved = favorites.find((f) => f.projectId === projectId);
  return (
    <div className="save-control">
      <button
        type="button"
        className="save-residence"
        aria-pressed={!!saved}
        disabled={pending || loading}
        onClick={async () => {
          if (!user) {
            setReturnTo(location.pathname + location.search + location.hash);
            return;
          }
          if (busy.current) return;
          busy.current = true;
          setPending(true);
          setError('');
          try {
            const r = await fetch(
              saved
                ? '/api/customer/favorites/' + saved.id + '/'
                : '/api/customer/favorites/',
              {
                method: saved ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saved ? {} : { projectId }),
              },
            );
            const data = await r.json();
            if (!r.ok) throw Error(data.error);
            await refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Please try again.');
          } finally {
            setPending(false);
            busy.current = false;
          }
        }}
      >
        <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        {pending ? 'Saving…' : saved ? 'In your shortlist' : 'Save residence'}
      </button>
      {returnTo && !user && (
        <p className="save-prompt">
          A private place for the homes you love.{' '}
          <Link href={'/sign-in?returnTo=' + encodeURIComponent(returnTo)}>
            Sign in to save this residence ↗
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function SaveSearch({ filters }: { filters: SearchFilters }) {
  const { user } = useCustomer();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(
      filters.city ? filters.city + ' collection' : 'My considered collection',
    ),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [returnTo, setReturnTo] = useState('');
  const busy = useRef(false);
  return (
    <div className="save-search">
      <button
        className="text-link"
        onClick={() => {
          setOpen(!open);
          setReturnTo(location.pathname + location.search);
        }}
      >
        Save this search ↗
      </button>
      {open && (
        <div className="saved-search-editor">
          {user ? (
            <form
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                const parsed = savedSearchSchema.safeParse({ name, filters });
                if (!parsed.success) {
                  setError(parsed.error.issues[0].message);
                  return;
                }
                if (busy.current) return;
                busy.current = true;
                setPending(true);
                setError('');
                try {
                  const r = await fetch('/api/customer/saved-searches/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed.data),
                  });
                  const data = await r.json();
                  if (!r.ok) throw Error(data.error);
                  setMessage(
                    'Your search is saved in your private collection.',
                  );
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Please try again.',
                  );
                } finally {
                  busy.current = false;
                  setPending(false);
                }
              }}
            >
              <label htmlFor="saved-search-name">Name your search</label>
              <input
                id="saved-search-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                aria-describedby={error ? 'saved-search-error' : undefined}
              />
              {error && (
                <p id="saved-search-error" role="alert" className="field-error">
                  {error}
                </p>
              )}
              {message ? (
                <output  className="save-search-success">
                  {message}{' '}
                  <Link href="/account#searches">View saved searches ↗</Link>
                </output>
              ) : (
                <button className="button dark" disabled={pending}>
                  {pending ? 'Saving…' : 'Save to my account'}
                </button>
              )}
            </form>
          ) : (
            <p className="save-prompt">
              Keep this selection for another day.{' '}
              <Link href={'/sign-in?returnTo=' + encodeURIComponent(returnTo)}>
                Sign in to save your search ↗
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
