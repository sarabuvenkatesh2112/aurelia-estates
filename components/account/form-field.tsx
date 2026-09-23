'use client';
import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export function FormField({
  label,
  error,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const id = useId(),
    [visible, setVisible] = useState(false);
  const password = type === 'password';
  return (
    <div className="client-field">
      <label htmlFor={id}>{label}</label>
      <div className="client-input-wrap">
        <input
          {...props}
          id={id}
          type={password && visible ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? id + '-error' : undefined}
        />
        {password && (
          <button
            type="button"
            className="password-toggle"
            aria-label={
              visible
                ? 'Hide ' + label.toLowerCase()
                : 'Show ' + label.toLowerCase()
            }
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" id={id + '-error'}>
          {error}
        </p>
      )}
    </div>
  );
}
