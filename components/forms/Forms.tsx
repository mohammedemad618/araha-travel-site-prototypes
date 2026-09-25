'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Arrow } from '../ui/Arrow';
import { WhatsAppGlyph } from '../ui/Icon';
import { WhatsAppLink } from '../WhatsApp';
import { Honeypot, PhoneField, SelectField, TextAreaField, TextField } from './Field';
import { useNetlifyForm, type FormStatus } from './useNetlifyForm';

function Success({
  onReset,
  dark,
  followUp,
}: {
  onReset: () => void;
  dark?: boolean;
  /** Pre-filled WhatsApp text so the customer can follow up in one tap. */
  followUp?: string;
}) {
  const t = useTranslations('form');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const steps = t.raw('nextSteps') as string[];
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div role="status" className="flex flex-col gap-4 py-8">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border ${dark ? 'border-gold text-gold' : 'border-bronze text-bronze'}`}
        aria-hidden="true"
      >
        ✓
      </span>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className={`m-0 font-display text-[30px] font-medium outline-none ${dark ? 'text-ivory' : 'text-ink'}`}
      >
        {t('successTitle')}
      </h3>
      <p className={`m-0 max-w-[420px] text-[16px] leading-[1.85] ${dark ? 'text-sand' : 'text-muted'}`}>
        {t('successBody')}
      </p>
      <div>
        <div className={`mb-2 text-[13.5px] font-medium ${dark ? 'text-mist' : 'text-ink-2'}`}>
          {t('nextTitle')}
        </div>
        <ol
          className={`m-0 flex list-none flex-col gap-2 p-0 text-[14.5px] ${dark ? 'text-mist' : 'text-muted'}`}
        >
          {steps.map((s, i) => (
            <li key={s} className="flex items-baseline gap-3">
              <span className={`font-latin text-xs ${dark ? 'text-gold' : 'text-bronze'}`}>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {followUp && (
          <WhatsAppLink
            text={followUp}
            source="form-success"
            className="inline-flex items-center gap-2 rounded-[1px] bg-whatsapp px-4 py-2.5 text-[14.5px] font-medium text-ink"
          >
            <WhatsAppGlyph size={16} />
            {t('followWhatsApp')}
          </WhatsAppLink>
        )}
        <button
          type="button"
          onClick={onReset}
          className={`border-b border-gold py-1.5 text-[14.5px] ${dark ? 'text-ivory' : 'text-ink'}`}
        >
          {t('again')}
        </button>
      </div>
    </div>
  );
}

function SubmitRow({
  status,
  label,
  dark,
  compact,
}: {
  status: FormStatus;
  label: string;
  dark?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations('form');
  return (
    <div className="col-span-full mt-1.5 flex flex-col gap-3.5">
      <button
        type="submit"
        disabled={status === 'sending'}
        className={`flex items-center justify-between rounded-[1px] px-7 text-base transition-colors disabled:opacity-60 ${
          compact ? 'py-3.5' : 'py-[19px]'
        } ${dark ? 'bg-ivory text-ink hover:bg-sand' : 'bg-ink text-ivory hover:bg-ink-2'}`}
      >
        {status === 'sending' ? t('sending') : label}
        <Arrow className={dark ? 'text-bronze' : 'text-gold'} />
      </button>
      {status === 'error' && (
        <span role="alert" className={`text-sm ${dark ? 'text-[#f2b8b5]' : 'text-[#b3261e]'}`}>
          {t('error')}
        </span>
      )}
      {!compact && (
        <span className={`text-[13px] leading-[1.7] ${dark ? 'text-fog' : 'text-muted'}`}>
          {t('responseTime')}{' '}
          <Link href="/privacy" className="underline decoration-gold/60 underline-offset-4">
            {t('privacy')}
          </Link>
        </span>
      )}
    </div>
  );
}

export function CustomTripForm() {
  const t = useTranslations('form');
  const tw = useTranslations('whatsapp');
  const { status, errors, summary, onSubmit, reset } = useNetlifyForm('custom-trip', {
    required: ['destination', 'name', 'phone'],
    phone: 'phone',
  });
  if (status === 'sent') {
    return (
      <Success
        onReset={reset}
        followUp={`${tw('planTrip')}: ${summary.destination ?? ''} — ${summary.name ?? ''}`}
      />
    );
  }
  return (
    <form
      name="custom-trip"
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-8 gap-y-[30px]"
    >
      <Honeypot />
      <TextField
        name="destination"
        label={t('destination')}
        placeholder={t('destinationPh')}
        errors={errors}
        full
        required
      />
      <SelectField
        name="travelers"
        label={t('travelers')}
        options={t.raw('travelerOptions') as string[]}
        errors={errors}
      />
      <TextField name="date" label={t('date')} placeholder={t('datePh')} errors={errors} />
      <SelectField
        name="budget"
        label={t('budget')}
        options={t.raw('budgetOptions') as string[]}
        errors={errors}
      />
      <TextField
        name="name"
        label={t('name')}
        placeholder={t('namePh')}
        autoComplete="name"
        errors={errors}
        required
      />
      <PhoneField name="phone" label={t('phone')} placeholder={t('phonePh')} errors={errors} full required />
      <SubmitRow status={status} label={t('submitTrip')} />
    </form>
  );
}

export function BookingForm({
  packageTitle,
  departures,
  departure,
  onDepartureChange,
  travellers,
}: {
  packageTitle: string;
  /** Formatted departure labels. */
  departures: string[];
  /** The departure picked in the booking card, kept in sync both ways. */
  departure?: string;
  onDepartureChange?: (label: string) => void;
  /** e.g. "2 adults, 1 child", chosen with the traveller stepper. */
  travellers: string;
}) {
  const t = useTranslations('form');
  const tc = useTranslations('common');
  const tp = useTranslations('package');
  const { status, errors, summary, onSubmit, reset } = useNetlifyForm('package-booking', {
    required: ['name', 'phone'],
    phone: 'phone',
  });
  if (status === 'sent') {
    return (
      <Success
        onReset={reset}
        dark
        followUp={tp('waMessageFull', {
          title: packageTitle,
          date: summary.departure ?? tc('onRequest'),
          travellers: summary.travellers ?? travellers,
        })}
      />
    );
  }
  return (
    <form name="package-booking" onSubmit={onSubmit} noValidate className="mt-5.5 grid grid-cols-1 gap-5">
      <Honeypot />
      <input type="hidden" name="package" value={packageTitle} />
      <input type="hidden" name="travellers" value={travellers} />
      <TextField
        name="name"
        label={t('name')}
        placeholder={t('namePh')}
        autoComplete="name"
        errors={errors}
        dark
        required
      />
      <PhoneField name="phone" label={t('phone')} placeholder={t('phonePh')} errors={errors} dark required />
      <SelectField
        name="departure"
        label={t('departure')}
        options={departures.length ? departures : [tc('onRequest')]}
        value={departures.length ? (departure ?? departures[0]) : tc('onRequest')}
        onChange={onDepartureChange}
        errors={errors}
        dark
      />
      <TextAreaField name="notes" label={t('notes')} rows={2} errors={errors} dark />
      <SubmitRow status={status} label={t('submitBooking')} dark />
    </form>
  );
}

export function ContactForm() {
  const t = useTranslations('form');
  const { status, errors, onSubmit, reset } = useNetlifyForm('contact', {
    required: ['name', 'phone', 'message'],
    phone: 'phone',
    email: 'email',
  });
  if (status === 'sent') return <Success onReset={reset} />;
  return (
    <form
      name="contact"
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-8 gap-y-[30px]"
    >
      <Honeypot />
      <TextField
        name="name"
        label={t('name')}
        placeholder={t('namePh')}
        autoComplete="name"
        errors={errors}
        required
      />
      <PhoneField name="phone" label={t('phone')} placeholder={t('phonePh')} errors={errors} required />
      <TextField
        name="email"
        type="email"
        dir="ltr"
        label={t('email')}
        autoComplete="email"
        errors={errors}
        full
      />
      <TextAreaField name="message" label={t('message')} rows={4} errors={errors} full required />
      <SubmitRow status={status} label={t('submitMessage')} />
    </form>
  );
}

/** Short "call me back" form used in the WhatsApp panel and on the contact page. */
export function CallbackForm({ dark = false }: { dark?: boolean }) {
  const t = useTranslations('form');
  const { status, errors, onSubmit, reset } = useNetlifyForm('callback', {
    required: ['name', 'phone'],
    phone: 'phone',
  });
  if (status === 'sent') return <Success onReset={reset} dark={dark} />;
  return (
    <form name="callback" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4">
      <Honeypot />
      <TextField name="name" label={t('name')} autoComplete="name" errors={errors} dark={dark} required />
      <PhoneField
        name="phone"
        label={t('phone')}
        placeholder={t('phonePh')}
        errors={errors}
        dark={dark}
        required
      />
      <SelectField
        name="time"
        label={t('preferredTime')}
        options={t.raw('timeOptions') as string[]}
        errors={errors}
        dark={dark}
      />
      <SubmitRow status={status} label={t('submitCallback')} dark={dark} compact />
    </form>
  );
}
