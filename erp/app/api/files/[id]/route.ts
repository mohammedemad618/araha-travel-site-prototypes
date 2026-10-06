import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { repo } from '@/lib/repo';
import { actionTenant, toObjectId } from '@/lib/session';
import { bucket, type FileMeta } from '@/lib/files';
import { can, type Permission } from '@/lib/rbac';
import type { EntityType } from '@/lib/types';

const READ: Record<EntityType, Permission> = {
  lead: 'leads.read',
  customer: 'customers.read',
  booking: 'bookings.read',
  visa: 'visas.read',
  supplier: 'suppliers.read',
  quote: 'quotes.read',
};

const COLLECTION = {
  lead: 'leads',
  customer: 'customers',
  booking: 'bookings',
  visa: 'visas',
  supplier: 'suppliers',
  quote: 'quotes',
} as const satisfies Record<EntityType, string>;

/** Streams an attachment to signed-in staff of the same company only. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await actionTenant();
  const ctx = auth.ok ? auth.ctx : null;
  if (!ctx?.tenant) return new NextResponse('Not found', { status: 404 });
  const id = toObjectId((await params).id);
  if (!id) return new NextResponse('Not found', { status: 404 });
  const db = await getDb();
  const file = await db
    .collection<{ _id: typeof id; filename: string; length: number; metadata: FileMeta }>('attachments.files')
    .findOne({ _id: id, 'metadata.tenantId': ctx.tenant._id });
  if (!file || !can(ctx.role, READ[file.metadata.entityType]))
    return new NextResponse('Not found', { status: 404 });
  // The record the file is attached to must be one this member can see.
  const r = await repo(ctx);
  if (!(await r[COLLECTION[file.metadata.entityType]].exists({ _id: file.metadata.entityId })))
    return new NextResponse('Not found', { status: 404 });

  const stream = (await bucket()).openDownloadStream(id);
  const download = new URL(req.url).searchParams.get('download') === '1';
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': file.metadata.contentType,
      'Content-Length': String(file.length),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
