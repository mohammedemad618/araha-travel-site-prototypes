import type { ObjectId } from 'mongodb';
import { FileText, ImageIcon } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';
import { listFiles } from '@/lib/files';
import { formatDateTime } from '@/lib/dates';
import type { EntityType } from '@/lib/types';
import { Card } from '../ui';
import { UploadForm, DeleteFileButton } from './UploadForm';

export async function Attachments({
  tenantId,
  type,
  id,
  canWrite,
}: {
  tenantId: ObjectId;
  type: EntityType;
  id: ObjectId;
  canWrite: boolean;
}) {
  const { t, lang } = await getI18n();
  const files = await listFiles(tenantId, type, id);
  return (
    <Card title={t('common.attachments')}>
      {files.length > 0 && (
        <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
          {files.map((f) => {
            const Icon = f.metadata.contentType === 'application/pdf' ? FileText : ImageIcon;
            return (
              <li
                key={String(f._id)}
                className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
              >
                <Icon size={18} className="shrink-0 text-bronze" aria-hidden="true" />
                <a
                  href={`/api/files/${f._id}`}
                  target="_blank"
                  rel="noopener"
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {f.filename}
                </a>
                <span className="num hidden text-[12px] text-faint sm:inline">
                  {Math.ceil(f.length / 1024)} KB · {formatDateTime(f.uploadDate, lang)}
                </span>
                <a
                  href={`/api/files/${f._id}?download=1`}
                  className="text-[12.5px] text-info hover:underline"
                >
                  {t('common.download')}
                </a>
                {canWrite && <DeleteFileButton id={String(f._id)} />}
              </li>
            );
          })}
        </ul>
      )}
      {canWrite ? (
        <UploadForm entityType={type} entityId={String(id)} />
      ) : (
        files.length === 0 && <p className="m-0 text-[13.5px] text-muted">—</p>
      )}
    </Card>
  );
}
