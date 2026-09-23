'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInSchema } from '@/lib/validation/customer';
export function AdminSignIn() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const router = useRouter();
  return (
    <form
      className="office-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.currentTarget),
          parsed = signInSchema.safeParse({
            email: f.get('email'),
            password: f.get('password'),
          });
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setBusy(true);
        setError('');
        try {
          const response = await fetch('/api/auth/sign-in/email/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });
          if (!response.ok) {
            setError(
              'Sign-in could not be completed. Check your details or try again shortly.',
            );
            return;
          }
          const access = await fetch('/api/admin/', { cache: 'no-store' });
          if (!access.ok) {
            setError(
              access.status === 403
                ? 'This account does not have active staff access.'
                : 'The office is temporarily unavailable. Please try again.',
            );
            return;
          }
          router.replace('/admin/');
          router.refresh();
        } catch {
          setError('The office is temporarily unavailable. Please try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      <label className="office-check">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
        />
        Show password
      </label>
      {error && (
        <p role="alert" className="office-error">
          {error}
        </p>
      )}
      <button className="office-primary" disabled={busy}>
        {busy ? 'Opening the office…' : 'Enter the private office ↗'}
      </button>
    </form>
  );
}
