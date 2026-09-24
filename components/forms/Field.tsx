'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { FieldErrors } from './useNetlifyForm';

type Common = {
  name: string;
  label: string;
  errors: FieldErrors;
  dark?: boolean;
  full?: boolean;
  hideLabel?: boolean;
};

function useFieldProps(name: string, errors: FieldErrors) {
  const id = useId();
  const t = useTranslations('form');
  const error = errors[name];
  return {
    id,
    errorId: `${id}-error`,
    invalid: Boolean(error),
    message: error ? t(error) : null,
  };
}

function Wrapper({
  id,
  label,
  full,
  dark,
  hideLabel,
  message,
  errorId,
  children,
}: {
  id: string;
  label: string;
  full?: boolean;
  dark?: boolean;
  hideLabel?: boolean;
  message: string | null;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${full ? 'col-span-full' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : `text-[13px] ${dark ? 'text-fog' : 'text-muted'}`}>
        {label}
      </label>
      {children}
      {message && (
        <span id={errorId} role="alert" className={`text-[13px] ${dark ? 'text-[#f2b8b5]' : 'text-[#b3261e]'}`}>
          {message}
        </span>
      )}
    </div>
  );
}

export function TextField({
  type = 'text',
  placeholder,
  dir,
  autoComplete,
  inputMode,
  ...props
}: Common & {
  type?: string;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  const f = useFieldProps(props.name, props.errors);
  return (
    <Wrapper {...f} {...props}>
      <input
        id={f.id}
        name={props.name}
        type={type}
        placeholder={placeholder}
        dir={dir}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={f.invalid}
        aria-describedby={f.invalid ? f.errorId : undefined}
        className={`field ${props.dark ? 'field-dark' : ''} ${dir === 'ltr' ? 'text-end font-latin' : ''}`}
      />
    </Wrapper>
  );
}

export function PhoneField(props: Common & { placeholder: string }) {
  return (
    <TextField
      {...props}
      type="tel"
      dir="ltr"
      inputMode="tel"
      autoComplete="tel"
    />
  );
}

export function SelectField({ options, defaultValue, ...props }: Common & { options: string[]; defaultValue?: string }) {
  const f = useFieldProps(props.name, props.errors);
  return (
    <Wrapper {...f} {...props}>
      <select
        id={f.id}
        name={props.name}
        defaultValue={defaultValue}
        className={`field ${props.dark ? 'field-dark' : ''}`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function TextAreaField(props: Common & { placeholder?: string; rows?: number }) {
  const f = useFieldProps(props.name, props.errors);
  return (
    <Wrapper {...f} {...props}>
      <textarea
        id={f.id}
        name={props.name}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        aria-invalid={f.invalid}
        aria-describedby={f.invalid ? f.errorId : undefined}
        className={`field resize-y ${props.dark ? 'field-dark' : ''}`}
      />
    </Wrapper>
  );
}

/** Hidden spam trap; Netlify discards submissions that fill it in. */
export function Honeypot() {
  return (
    <p className="hidden" aria-hidden="true">
      <label>
        Leave this empty: <input name="bot-field" tabIndex={-1} autoComplete="off" />
      </label>
    </p>
  );
}
