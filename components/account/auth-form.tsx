'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  signUpSchema,
  signInSchema,
  passwordRules,
  safeReturnPath,
} from '@/lib/validation/customer';
import { FormField } from './form-field';
import { useCustomer } from './customer-context';
export function AuthForm({
  signup,
  returnTo,
}: {
  signup: boolean;
  returnTo: string;
}) {
  const router = useRouter(),
    { refresh } = useCustomer();
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({}),
    [submitted, setSubmitted] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false);
  const schema = signup ? signUpSchema : signInSchema;
  const payload = signup
    ? values
    : { email: values.email, password: values.password };
  const parsed = schema.safeParse(payload);
  const fields: Record<string, string> = {};
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fields[key]) fields[key] = issue.message;
    }
  const field = (
    name: 'name' | 'email' | 'phone' | 'password' | 'confirmPassword',
    label: string,
    type = 'text',
    autocomplete?: string,
  ) => (
    <FormField
      key={name}
      name={name}
      label={label}
      type={type}
      autoComplete={autocomplete}
      required
      value={values[name]}
      maxLength={
        name === 'password' || name === 'confirmPassword'
          ? 128
          : name === 'name'
            ? 60
            : name === 'phone'
              ? 30
              : 254
      }
      onChange={(e) => setValues({ ...values, [name]: e.target.value })}
      onBlur={() => setTouched({ ...touched, [name]: true })}
      error={submitted || touched[name] ? fields[name] : undefined}
    />
  );
  return (
    <form
      className="client-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (!parsed.success || busy.current) return;
        busy.current = true;
        setPending(true);
        try {
          const r = await fetch(
            signup ? '/api/auth/sign-up/email/' : '/api/auth/sign-in/email/',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsed.data),
            },
          );
          const data = await r.json();
          if (!r.ok) throw Error(data.error || 'Please try again.');
          await refresh();
          router.replace(safeReturnPath(returnTo));
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Please try again.');
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      {signup && field('name', 'Full name', 'text', 'name')}
      {field('email', 'Email address', 'email', 'email')}
      {signup && field('phone', 'Mobile number', 'tel', 'tel')}
      {field(
        'password',
        'Password',
        'password',
        signup ? 'new-password' : 'current-password',
      )}
      {signup && (
        <>
          <ul className="password-rules" aria-label="Password requirements">
            {passwordRules.map((rule) => (
              <li key={rule.label} data-met={rule.check(values.password)}>
                <span aria-hidden="true">
                  {rule.check(values.password) ? '✓' : '○'}
                </span>{' '}
                {rule.label}
                <span className="sr-only">
                  {rule.check(values.password) ? ' met' : ' not yet met'}
                </span>
              </li>
            ))}
          </ul>
          {field(
            'confirmPassword',
            'Confirm password',
            'password',
            'new-password',
          )}
          <label className="client-check">
            <input
              type="checkbox"
              checked={values.terms}
              onChange={(e) => {
                setValues({ ...values, terms: e.target.checked });
                setTouched({ ...touched, terms: true });
              }}
              aria-describedby="terms-error"
            />{' '}
            <span>
              I acknowledge the <Link href="/terms">Terms</Link> and{' '}
              <Link href="/privacy">Privacy notice</Link>.
            </span>
          </label>
          {(submitted || touched.terms) && fields.terms && (
            <p className="field-error" id="terms-error">
              {fields.terms}
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <button className="button dark" disabled={pending} aria-busy={pending}>
        {pending
          ? 'Opening your private collection…'
          : signup
            ? 'Create your account ↗'
            : 'Enter your collection ↗'}
      </button>
      <p className="client-switch">
        {signup ? 'Already part of Aurelia?' : 'A space for your next chapter.'}{' '}
        <Link
          href={
            (signup ? '/sign-in' : '/sign-up') +
            '?returnTo=' +
            encodeURIComponent(returnTo)
          }
        >
          {signup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
