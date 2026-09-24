'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Arrow } from '../ui/Arrow';
import { Honeypot, PhoneField, SelectField, TextAreaField, TextField } from './Field';
import { useNetlifyForm, type FormStatus } from './useNetlifyForm';

function Success({ onReset, dark }: { onReset: () => void; dark?: boolean }) {
  const t = useTranslations('form');
  return (
    <div role="status" className="flex flex-col gap-4 py-10">
      <span className="h-2.5 w-2.5 rotate-45 bg-gold" aria-hidden="true" />
      <h3 className={`m-0 font-display text-[34px] font-medium ${dark ? 'text-ivory' : 'text-ink'}`}>
        {t('successTitle')}
      </h3>
      <p className={`m-0 max-w-[380px] text-[16.5px] leading-[1.85] ${dark ? 'text-sand' : 'text-muted'}`}>
        {t('successBody')}
      </p>
      <button
        type="button"
        onClick={onReset}
        className={`mt-2.5 self-start border-b border-gold py-1.5 text-[14.5px] ${dark ? 'text-ivory' : 'text-ink'}`}
      >
        {t('again')}
      </button>
    </div>
  );
}

function SubmitRow({ status, label, dark }: { status: FormStatus; label: string; dark?: boolean }) {
  const t = useTranslations('form');
  return (
    <div className="col-span-full mt-1.5 flex flex-col gap-3.5">
      <button
        type="submit"
        disabled={status === 'sending'}
        className={`flex items-center justify-between rounded-[1px] px-7 py-[19px] text-base transition-colors disabled:opacity-60 ${
          dark ? 'bg-ivory text-ink hover:bg-sand' : 'bg-ink text-ivory hover:bg-ink-2'
        }`}
      >
        {status === 'sending' ? t('sending') : label}
        <Arrow className="text-gold" />
      </button>
      {status === 'error' && (
        <span role="alert" className={`text-sm ${dark ? 'text-[#f2b8b5]' : 'text-[#b3261e]'}`}>
          {t('error')}
        </span>
      )}
      <span className={`text-[13px] ${dark ? 'text-fog' : 'text-muted'}`}>
        {t('responseTime')}{' '}
        <Link href="/privacy" className="underline decoration-gold/60 underline-offset-4">
          {t('privacy')}
        </Link>
      </span>
    </div>
  );
}

export function CustomTripForm() {
  const t = useTranslations('form');
  const { status, errors, onSubmit, reset } = useNetlifyForm('custom-trip', {
    required: ['destination', 'name', 'phone'],
    phone: 'phone',
  });
  if (status === 'sent') return <Success onReset={reset} />;
  return (
    <form
      name="custom-trip"
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-8 gap-y-[30px]"
    >
      <Honeypot />
      <TextField name="destination" label={t('destination')} placeholder={t('destinationPh')} errors={errors} full />
      <SelectField name="travelers" label={t('travelers')} options={t.raw('travelerOptions') as string[]} errors={errors} />
      <TextField name="date" label={t('date')} placeholder={t('datePh')} errors={errors} />
      <SelectField name="budget" label={t('budget')} options={t.raw('budgetOptions') as string[]} errors={errors} />
      <TextField name="name" label={t('name')} placeholder={t('namePh')} autoComplete="name" errors={errors} />
      <PhoneField name="phone" label={t('phone')} placeholder={t('phonePh')} errors={errors} full />
      <SubmitRow status={status} label={t('submitTrip')} />
    </form>
  );
}

export function BookingForm({ packageTitle, departures }: { packageTitle: string; departures: string[] }) {
  const t = useTranslations('form');
  const tc = useTranslations('common');
  const { status, errors, onSubmit, reset } = useNetlifyForm('package-booking', {
    required: ['name', 'phone'],
    phone: 'phone',
  });
  if (status === 'sent') return <Success onReset={reset} dark />;
  return (
    <form name="package-booking" onSubmit={onSubmit} noValidate className="mt-5.5 grid grid-cols-1 gap-5">
      <Honeypot />
      <input type="hidden" name="package" value={packageTitle} />
      <TextField name="name" label={t('name')} placeholder={t('namePh')} autoComplete="name" errors={errors} dark />
      <PhoneField name="phone" label={t('phone')} placeholder={t('phonePh')} errors={errors} dark />
      <SelectField
        name="departure"
        label={t('departure')}
        options={departures.length ? departures : [tc('onRequest')]}
        errors={errors}
        dark
      />
      <SelectField name="travelers" label={t('travelers')} options={t.raw('travelerOptions') as string[]} errors={errors} dark />
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
      <TextField name="name" label={t('name')} placeholder={t('namePh')} autoComplete="name" errors={errors} />
      <PhoneField name="phone" label={t('phone')} placeholder={t('phonePh')} errors={errors} />
      <TextField name="email" type="email" dir="ltr" label={t('email')} autoComplete="email" errors={errors} full />
      <TextAreaField name="message" label={t('message')} rows={4} errors={errors} full />
      <SubmitRow status={status} label={t('submitMessage')} />
    </form>
  );
}
