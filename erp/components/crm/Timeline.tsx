import type { ObjectId } from 'mongodb';
import { MessageSquare, Phone, Users as UsersIcon, Cog, StickyNote } from 'lucide-react';
import { tenantRepo } from '@/lib/repo';
import { getI18n } from '@/lib/i18n/server';
import { formatDateTime } from '@/lib/dates';
import { getStaff } from '@/lib/queries';
import type { EntityType } from '@/lib/types';
import type { TFn } from '@/lib/i18n/translate';
import { Card } from '../ui';
import { ActivityForm } from './ActivityForm';

const ICON = { note: StickyNote, call: Phone, whatsapp: MessageSquare, meeting: UsersIcon, system: Cog };

/** System entries are stored as "key" or "key:value" and translated on display. */
function systemText(text: string, t: TFn): string {
  const [key, ...rest] = text.split(':');
  const value = rest.join(':');
  const known = ['created', 'stage', 'converted', 'status', 'payment', 'refund', 'void', 'website', 'visa'];
  if (!key || !known.includes(key)) return text;
  let shown = value;
  if (key === 'stage') shown = t(`leads.stages.${value}`);
  if (key === 'status') shown = t(`bookings.statuses.${value}`);
  if (key === 'visa') return t('activities.system.status', { value: t(`visas.statuses.${value}`) });
  return t(`activities.system.${key}`, { value: shown });
}

export async function Timeline({
  tenantId,
  type,
  id,
  canWrite = true,
}: {
  tenantId: ObjectId;
  type: EntityType;
  id: ObjectId;
  canWrite?: boolean;
}) {
  const { t, lang } = await getI18n();
  const r = await tenantRepo(tenantId);
  const [items, staff] = await Promise.all([
    r.activities.find({ 'entity.type': type, 'entity.id': id }).sort({ createdAt: -1 }).limit(100).toArray(),
    getStaff(tenantId),
  ]);
  return (
    <Card title={t('activities.timeline')}>
      {canWrite && <ActivityForm entityType={type} entityId={String(id)} />}
      {items.length === 0 ? (
        <p className="m-0 mt-4 text-[13.5px] text-muted">{t('activities.empty')}</p>
      ) : (
        <ol className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
          {items.map((a) => {
            const Icon = ICON[a.kind];
            const who = staff.find((s) => s.id === String(a.userId))?.name;
            return (
              <li key={String(a._id)} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    a.kind === 'system' ? 'bg-ink/5 text-faint' : 'bg-sand text-bronze'
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                    <span className="font-medium text-ink-3">{t(`activities.kinds.${a.kind}`)}</span>
                    {who && <span>· {who}</span>}
                    <span>· {formatDateTime(a.createdAt, lang)}</span>
                  </div>
                  <p className="m-0 mt-0.5 text-[14px] whitespace-pre-wrap">
                    {a.kind === 'system' ? systemText(a.text, t) : a.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
