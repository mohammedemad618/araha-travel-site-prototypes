'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { isValidPhone } from '@/lib/format';

export type FormStatus = 'idle' | 'sending' | 'sent' | 'error';
export type FieldErrors = Record<string, 'required' | 'invalidPhone' | 'invalidEmail'>;

type Rules = { required?: string[]; phone?: string; email?: string };

/**
 * Submits a form to Netlify Forms. The matching static form definition lives
 * in public/__forms.html so Netlify registers the fields at deploy time.
 */
export function useNetlifyForm(formName: string, rules: Rules) {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState<Record<string, string>>({});

  function validate(data: FormData): FieldErrors {
    const next: FieldErrors = {};
    for (const name of rules.required ?? []) {
      if (!String(data.get(name) ?? '').trim()) next[name] = 'required';
    }
    if (rules.phone) {
      const v = String(data.get(rules.phone) ?? '');
      if (v.trim() && !isValidPhone(v)) next[rules.phone] = 'invalidPhone';
    }
    if (rules.email) {
      const v = String(data.get(rules.email) ?? '').trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) next[rules.email] = 'invalidEmail';
    }
    return next;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      // Focus the first invalid field in reading order.
      const first = [...form.elements].find(
        (el): el is HTMLElement => el instanceof HTMLElement && 'name' in el && Boolean(found[(el as HTMLInputElement).name]),
      );
      first?.focus();
      return;
    }
    data.set('form-name', formName);
    data.set('page', window.location.pathname);
    setStatus('sending');
    try {
      const body = new URLSearchParams();
      data.forEach((value, key) => body.append(key, String(value)));
      const res = await fetch('/__forms.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const values: Record<string, string> = {};
      data.forEach((value, key) => {
        if (!['form-name', 'page', 'bot-field'].includes(key)) values[key] = String(value);
      });
      setSummary(values);
      setStatus('sent');
      track('form_submit', { form: formName });
    } catch {
      setStatus('error');
    }
  }

  const reset = () => {
    setErrors({});
    setStatus('idle');
  };

  return { status, errors, summary, onSubmit, reset };
}
