'use client';
import { LocationLinks } from '@/components/location/location-links';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, ArrowUpRight } from 'lucide-react';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useExperience } from '@/components/layout/experience-provider';
import { useCustomer } from '@/components/account/customer-context';
import { FormField } from '@/components/account/form-field';
import {
  enquirySchema,
  visitSchema,
  VISIT_SLOTS,
  indiaDate,
  slotAvailable,
} from '@/lib/validation/forms';
import type { Property } from '@/types/property';
type Options = {
  configurations: { id: string; name: string }[];
  units: {
    id: string;
    unitNumber: string;
    unitTypeId: string;
    tower: { name: string };
  }[];
};
export function ContactForm({
  property,
  advisor,
  unitId,
}: {
  property?: Property;
  advisor?: boolean;
  unitId?: string;
}) {
  const { properties, open } = useExperience(),
    { user } = useCustomer();
  const [values, setValues] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    projectId: property?.id || properties[0]?.id || '',
    unitId: unitId || '',
    configurationId: '',
    message: '',
    preferredDate: '',
    preferredTime: '11:00',
    guestCount: '1',
    website: '',
  }));
  const [step, setStep] = useState(0),
    [fields, setFields] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [complete, setComplete] = useState(false),
    [reference, setReference] = useState(''),
    [options, setOptions] = useState<Options>({
      configurations: [],
      units: [],
    }),
    [optionError, setOptionError] = useState(''),
    [optionsPending, setOptionsPending] = useState(!advisor);
  const [openedAt] = useState(() => Date.now());
  const busy = useRef(false),
    token = useRef(''),
    heading = useRef<HTMLHeadingElement>(null);
  const selected =
    properties.find((p) => p.id === values.projectId) || property;
  useEffect(() => {
    if (advisor || !values.projectId) return;
    const controller = new AbortController();
    fetch('/api/projects/' + values.projectId + '/visit-options/', {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        const loaded = await r.json();
        if (!controller.signal.aborted) setOptions(loaded);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setOptionError(
            'Residence choices could not load. You can request a project introduction.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setOptionsPending(false);
      });
    return () => controller.abort();
  }, [values.projectId, advisor]);
  useEffect(() => {
    if (step > 0) heading.current?.focus();
  }, [step]);
  const payload = () => ({
    name: values.name,
    email: values.email,
    phone: values.phone,
    projectId: values.projectId,
    ...(values.unitId ? { unitId: values.unitId } : {}),
    message: values.message,
    website: values.website,
    idempotencyKey: token.current || '00000000-0000-4000-8000-000000000001',
    ...(!advisor
      ? {
          ...(values.configurationId
            ? { configurationId: values.configurationId }
            : {}),
          preferredDate: values.preferredDate,
          preferredTime: values.preferredTime,
          guestCount: values.guestCount,
        }
      : {}),
  });
  function validate(keys?: string[]) {
    const result = (advisor ? enquirySchema : visitSchema).safeParse(payload());
    const next: Record<string, string> = {};
    if (!result.success)
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if ((!keys || keys.includes(key)) && !next[key])
          next[key] = issue.message;
      }
    setFields((previous) =>
      keys
        ? {
            ...previous,
            ...Object.fromEntries(keys.map((k) => [k, next[k] || ''])),
          }
        : next,
    );
    return !Object.keys(next).length;
  }
  const change = (key: keyof typeof values, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setFields((previous) => ({ ...previous, [key]: '' }));
    setError('');
  };
  const field = (
    key: 'name' | 'email' | 'phone' | 'preferredDate' | 'guestCount',
    label: string,
    type = 'text',
    autoComplete?: string,
  ) => (
    <FormField
      label={label}
      name={key}
      type={type}
      value={values[key]}
      autoComplete={autoComplete}
      onChange={(e) => change(key, e.target.value)}
      onBlur={() => validate([key])}
      error={fields[key]}
      required
      min={
        key === 'preferredDate'
          ? indiaDate()
          : key === 'guestCount'
            ? 1
            : undefined
      }
      max={key === 'guestCount' ? 10 : undefined}
      maxLength={key === 'name' ? 60 : key === 'email' ? 254 : 30}
    />
  );
  const details = (
    <>
      {field('name', 'Full name', 'text', 'name')}
      <div className="form-row">
        {field('email', 'Email address', 'email', 'email')}
        {field('phone', 'Mobile number', 'tel', 'tel')}
      </div>
      {user && (
        <p className="fine-print">
          This request will be saved to your signed-in account.
        </p>
      )}
    </>
  );
  const preference = (
    <>
      <div className="client-field">
        <label htmlFor="visit-project">Preferred residence</label>
        <select
          id="visit-project"
          value={values.projectId}
          onChange={(e) => {
            setValues({
              ...values,
              projectId: e.target.value,
              unitId: '',
              configurationId: '',
            });
            setOptions({ configurations: [], units: [] });
            setOptionsPending(true);
            setOptionError('');
          }}
          aria-invalid={!!fields.projectId}
          aria-describedby={fields.projectId ? 'project-error' : undefined}
        >
          <option value="" disabled>
            Choose a residence
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {fields.projectId && (
          <p className="field-error" id="project-error">
            {fields.projectId}
          </p>
        )}
      </div>
      {!advisor && (
        <>
          <div className="client-field">
            <label htmlFor="visit-configuration">
              Configuration preference
            </label>
            <select
              id="visit-configuration"
              value={values.configurationId}
              disabled={optionsPending}
              onChange={(e) =>
                setValues({
                  ...values,
                  configurationId: e.target.value,
                  unitId: '',
                })
              }
            >
              <option value="">Let us guide you</option>
              {options.configurations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="client-field">
            <label htmlFor="visit-unit">Individual residence (optional)</label>
            <select
              id="visit-unit"
              value={values.unitId}
              disabled={optionsPending}
              onChange={(e) => change('unitId', e.target.value)}
              aria-invalid={!!fields.unitId}
              aria-describedby={fields.unitId ? 'unit-error' : undefined}
            >
              <option value="">A project introduction</option>
              {options.units
                .filter(
                  (u) =>
                    !values.configurationId ||
                    u.unitTypeId === values.configurationId,
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.tower.name} · {u.unitNumber}
                  </option>
                ))}
            </select>
            {fields.unitId && (
              <p id="unit-error" className="field-error">
                {fields.unitId}
              </p>
            )}
          </div>
          {optionsPending && (
            <output className="fine-print">
              Finding your available residences…
            </output>
          )}
          {optionError && <p className="fine-print">{optionError}</p>}
        </>
      )}
      <div className="client-field">
        <label htmlFor="visit-notes">
          {advisor ? 'Your enquiry (optional)' : 'A personal note (optional)'}
        </label>
        <textarea
          id="visit-notes"
          value={values.message}
          onChange={(e) => change('message', e.target.value)}
          onBlur={() => validate(['message'])}
          maxLength={500}
          rows={3}
          aria-invalid={!!fields.message}
          aria-describedby="note-count note-error"
        />
        <span id="note-count" className="note-count">
          {values.message.length} / 500
        </span>
        {fields.message && (
          <p id="note-error" className="field-error">
            {fields.message}
          </p>
        )}
      </div>
    </>
  );
  const review = (
    <dl className="visit-review">
      <dt>Guest</dt>
      <dd>{values.name}</dd>
      <dt>Residence</dt>
      <dd>
        {selected?.name}
        {values.unitId
          ? ' · ' +
            (options.units.find((u) => u.id === values.unitId)?.unitNumber ||
              'Selected residence')
          : ''}
      </dd>
      {values.configurationId && (
        <>
          <dt>Configuration</dt>
          <dd>
            {
              options.configurations.find(
                (c) => c.id === values.configurationId,
              )?.name
            }
          </dd>
        </>
      )}
      {selected?.slug && (
        <>
          <dt>Location</dt>
          <dd>
            {selected.neighbourhood}, {selected.city}
            <br />
            <LocationLinks slug={selected.slug} />
            <Link
              href={`/residences/${selected.slug}/#location`}
              onClick={() => open(null)}
            >
              View location &amp; directions ↗
            </Link>
          </dd>
        </>
      )}
      <dt>Date</dt>
      <dd>{values.preferredDate}</dd>
      <dt>Time</dt>
      <dd>{values.preferredTime} IST</dd>
      <dt>Contact</dt>
      <dd>
        {values.email}
        <br />
        {values.phone}
      </dd>
    </dl>
  );
  return (
    <div className="form-panel">
      <p className="eyebrow">YOUR AURELIA CONCIERGE</p>
      <DialogTitle className="dialog-heading">
        {complete
          ? 'A first step, thoughtfully made.'
          : advisor
            ? 'Let us talk about home.'
            : 'An invitation to experience.'}
      </DialogTitle>
      <DialogDescription>
        {complete
          ? 'Your request is safely recorded.'
          : advisor
            ? 'A personal conversation begins with you.'
            : 'Four considered steps toward a place of your own.'}
      </DialogDescription>
      {complete ? (
        <div className="visit-confirmation">
          <Check size={38} />
          <h3>{advisor ? 'Enquiry received.' : 'Visit request received.'}</h3>
          {!advisor && review}
          <p className="booking-reference">{reference}</p>
          <p>
            {advisor
              ? 'Your enquiry is saved.'
              : 'Your preferred visit is requested, not confirmed. No appointment has been guaranteed.'}
          </p>
          <div className="account-card-actions">
            {user ? (
              <Link
                className="text-link"
                href="/account"
                onClick={() => open(null)}
              >
                View in My Account ↗
              </Link>
            ) : (
              <Link
                className="text-link"
                href="/sign-up"
                onClick={() => open(null)}
              >
                Create a private collection ↗
              </Link>
            )}
            <Link
              className="text-link"
              href="/residences"
              onClick={() => open(null)}
            >
              Explore more residences ↗
            </Link>
          </div>
          {!user && (
            <p className="fine-print">
              Guest requests stay separate; creating an account does not claim
              previous guest records.
            </p>
          )}
        </div>
      ) : (
        <>
          <ol className="concierge-progress" aria-label="Visit steps">
            {!advisor &&
              ['Your details', 'Residence', 'Schedule', 'Review'].map(
                (label, i) => (
                  <li
                    key={label}
                    aria-current={step === i ? 'step' : undefined}
                  >
                    {i + 1}. {label}
                  </li>
                ),
              )}
          </ol>
          <form
            className="client-form concierge-step"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy.current) return;
              if (!advisor && step < 3) {
                const keys = [
                  ['name', 'email', 'phone'],
                  ['projectId', 'unitId', 'configurationId', 'message'],
                  ['preferredDate', 'preferredTime', 'guestCount'],
                ][step];
                if (validate(keys)) setStep(step + 1);
                return;
              }
              if (!validate()) {
                if (!advisor) {
                  const failed = visitSchema.safeParse(payload());
                  if (!failed.success) {
                    const first = String(failed.error.issues[0].path[0]);
                    setStep(
                      ['name', 'email', 'phone'].includes(first)
                        ? 0
                        : [
                              'projectId',
                              'unitId',
                              'configurationId',
                              'message',
                            ].includes(first)
                          ? 1
                          : 2,
                    );
                  }
                }
                return;
              }
              busy.current = true;
              setPending(true);
              setError('');
              if (!token.current) token.current = crypto.randomUUID();
              try {
                const parsed = (advisor ? enquirySchema : visitSchema).parse(
                  payload(),
                );
                const r = await fetch(
                  advisor ? '/api/enquiries/' : '/api/visits/',
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed),
                  },
                );
                const result = await r.json();
                if (!r.ok) {
                  if (result.fields)
                    setFields(
                      Object.fromEntries(
                        Object.entries(result.fields).map(([k, v]) => [
                          k,
                          (v as string[])[0],
                        ]),
                      ),
                    );
                  if (r.status === 400) token.current = '';
                  throw Error(result.error || 'Please try again.');
                }
                setReference(result.reference);
                setComplete(true);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'We could not save your request. Please try again.',
                );
              } finally {
                busy.current = false;
                setPending(false);
              }
            }}
          >
            <h3 ref={heading} tabIndex={-1}>
              {advisor
                ? 'Your personal introduction.'
                : [
                    'The details that make it personal.',
                    'A place that speaks to you.',
                    'Make time for possibility.',
                    'Every detail, considered.',
                  ][step]}
            </h3>
            {(advisor || step === 0) && details}
            {(advisor || step === 1) && preference}
            {!advisor && step === 2 && (
              <>
                <fieldset className="visit-date-choices">
                  <legend>Choose a day</legend>
                  {Array.from({ length: 4 }, (_, i) => {
                    const day = indiaDate(
                      new Date(openedAt + (i + 1) * 86400000),
                    );
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={values.preferredDate === day}
                        onClick={() => change('preferredDate', day)}
                      >
                        {new Intl.DateTimeFormat('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'Asia/Kolkata',
                        }).format(new Date(day + 'T12:00:00+05:30'))}
                      </button>
                    );
                  })}
                </fieldset>
                <FormField
                  label="Preferred visit date (YYYY-MM-DD)"
                  name="preferredDate"
                  value={values.preferredDate}
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => change('preferredDate', e.target.value)}
                  onBlur={() => validate(['preferredDate'])}
                  error={fields.preferredDate}
                />
                <p className="fine-print">
                  Choose a suggested day or enter another date within the next
                  year.
                </p>
                <fieldset className="visit-slots">
                  <legend>Preferred time · India Standard Time</legend>
                  {VISIT_SLOTS.map((slot) => (
                    <label key={slot}>
                      <input
                        type="radio"
                        name="preferredTime"
                        value={slot}
                        checked={values.preferredTime === slot}
                        disabled={
                          !!values.preferredDate &&
                          !slotAvailable(values.preferredDate, slot)
                        }
                        onChange={() => change('preferredTime', slot)}
                        aria-describedby={
                          fields.preferredTime ? 'slot-error' : undefined
                        }
                      />
                      <span>{slot}</span>
                    </label>
                  ))}
                </fieldset>
                {fields.preferredTime && (
                  <p id="slot-error" className="field-error">
                    {fields.preferredTime}
                  </p>
                )}
                {field('guestCount', 'Number of guests', 'number')}
              </>
            )}
            {!advisor && step === 3 && review}
            <div className="form-honeypot" aria-hidden="true">
              <label>
                Website
                <input
                  value={values.website}
                  onChange={(e) => change('website', e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>
            {(advisor || step === 3) && (
              <p className="fine-print">
                Submitting stores your contact details and request in
                Aurelia&apos;s database. This fictional platform does not
                confirm appointments or sales.
              </p>
            )}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="concierge-actions">
              {!advisor && step > 0 ? (
                <button
                  type="button"
                  className="text-link"
                  disabled={pending}
                  onClick={() => setStep(step - 1)}
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="button dark"
                disabled={pending || !values.projectId}
                aria-busy={pending}
              >
                {pending
                  ? 'Saving your request…'
                  : advisor
                    ? 'Send enquiry'
                    : step === 3
                      ? 'Confirm visit request'
                      : 'Continue'}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
