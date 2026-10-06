'use client';

import { createContext, useActionState, useContext, useEffect, useId, useRef, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import type { ActionResult } from '@/lib/forms';
import { buttonClass } from './ui';

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

const FieldErrors = createContext<Record<string, string>>({});
const Pending = createContext(false);

/**
 * A form bound to a server action. Shows the action's error or success message,
 * passes field errors down to <Field>, and follows `redirect` on success.
 */
export function ActionForm({
  action,
  children,
  className = '',
  resetOnSuccess = false,
  successMessage = true,
  onSuccess,
  id,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: boolean;
  onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void;
  id?: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const handled = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (state.redirect) router.push(state.redirect);
    } else {
      // Move focus to the first invalid field so keyboard users land on it.
      ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, resetOnSuccess, onSuccess, router]);

  return (
    <FieldErrors.Provider value={state && !state.ok ? (state.fields ?? {}) : {}}>
      <Pending.Provider value={pending}>
        {/* Submitted manually rather than via the action prop: React would
            otherwise reset every field after the action, wiping the user's
            input when the server returns a validation error. */}
        <form
          ref={ref}
          className={className}
          id={id}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
            const fd = new FormData(e.currentTarget, submitter);
            startTransition(() => formAction(fd));
          }}
        >
          {children}
          <FormMessage state={state} showSuccess={successMessage} />
        </form>
      </Pending.Provider>
    </FieldErrors.Provider>
  );
}

function FormMessage({ state, showSuccess }: { state: ActionResult | null; showSuccess: boolean }) {
  const { t } = useI18n();
  if (!state) return null;
  if (state.ok) {
    if (!showSuccess || state.redirect) return null;
    return (
      <p role="status" className="m-0 mt-3 flex items-center gap-2 text-[13.5px] text-success">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.message ? t(state.message) : t('common.saved')}
      </p>
    );
  }
  return (
    <p role="alert" className="m-0 mt-3 flex items-center gap-2 text-[13.5px] text-danger">
      <AlertCircle size={16} aria-hidden="true" />
      {t(`errors.${state.error}`)}
    </p>
  );
}

export function SubmitButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md';
  className?: string;
  /** Asks for confirmation before submitting. */
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const status = useFormStatus();
  const pending = useContext(Pending) || status.pending;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** The server's error for a field of the surrounding <ActionForm>, if any. */
export function useFieldError(name: string): string | undefined {
  return useContext(FieldErrors)[name];
}

/** Label + control + error/hint, wired for screen readers. */
export function Field({
  label,
  name,
  hint,
  required,
  className = '',
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    name: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }) => React.ReactNode;
}) {
  const { t } = useI18n();
  const errors = useContext(FieldErrors);
  const id = useId();
  const error = errors[name];
  const describedBy =
    [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-3">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children({ id, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="m-0 text-[12px] text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="m-0 text-[12.5px] text-danger">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> & {
  label: string;
  name: string;
  hint?: string;
  fieldClassName?: string;
};

export function TextField({ label, name, hint, required, fieldClassName, ...rest }: InputProps) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={fieldClassName}>
      {(p) => <input {...p} {...rest} className="field-input" />}
    </Field>
  );
}

export function TextArea({
  label,
  name,
  hint,
  required,
  fieldClassName,
  ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> & {
  label: string;
  name: string;
  hint?: string;
  fieldClassName?: string;
}) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={fieldClassName}>
      {(p) => <textarea {...p} {...rest} className="field-input" />}
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  required,
  options,
  placeholder,
  fieldClassName,
  ...rest
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> & {
  label: string;
  name: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  fieldClassName?: string;
}) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={fieldClassName}>
      {(p) => (
        <select {...p} {...rest} className="field-input">
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Branch picker, shown only when there is more than one branch to choose from. */
export function BranchField({
  branches,
  value,
  fieldClassName,
}: {
  branches?: { id: string; name: string }[];
  value?: string;
  fieldClassName?: string;
}) {
  const { t } = useI18n();
  if (!branches || branches.length < 2) return null;
  return (
    <SelectField
      label={t('workspace.branch')}
      name="branchId"
      defaultValue={value ?? branches[0]!.id}
      options={branches.map((b) => ({ value: b.id, label: b.name }))}
      fieldClassName={fieldClassName}
    />
  );
}

/** A one-button form for quick actions (status changes, delete…). */
export function ActionButton({
  action,
  fields,
  children,
  variant = 'secondary',
  size = 'sm',
  confirm,
}: {
  action: Action;
  fields: Record<string, string>;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md';
  confirm?: string;
}) {
  return (
    <ActionForm action={action} successMessage={false} className="inline">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size} confirm={confirm}>
        {children}
      </SubmitButton>
    </ActionForm>
  );
}
