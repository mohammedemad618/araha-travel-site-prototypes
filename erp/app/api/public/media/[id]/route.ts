import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { mediaBucket, type MediaFile } from '@/lib/media';

/**
 * A website image from the media library. Public by design (it is shown on the
 * website); ids are never reused, so the response can be cached for good.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response('Not found', { status: 404 });
  const db = await getDb();
  const file = await db.collection<MediaFile>('media.files').findOne({ _id: new ObjectId(id) });
  if (!file) return new Response('Not found', { status: 404 });
  const chunks: Buffer[] = [];
  for await (const chunk of (await mediaBucket()).openDownloadStream(file._id)) chunks.push(chunk as Buffer);
  return new Response(Buffer.concat(chunks), {
    headers: {
      'Content-Type': file.metadata.contentType,
      'Content-Length': String(file.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
