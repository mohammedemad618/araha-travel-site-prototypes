import 'server-only';
import { GridFSBucket, type ObjectId } from 'mongodb';
import { getDb } from './db';

// Website images, kept apart from private attachments: everything here is
// public, served to the website and downloaded into it when it is published.

export const MAX_IMAGE = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type MediaMeta = { tenantId: ObjectId; contentType: string; uploadedBy: ObjectId };
export type MediaFile = {
  _id: ObjectId;
  filename: string;
  length: number;
  uploadDate: Date;
  metadata: MediaMeta;
};

export async function mediaBucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getDb(), { bucketName: 'media' });
}

export async function listMedia(tenantId: ObjectId): Promise<MediaFile[]> {
  const db = await getDb();
  return db
    .collection<MediaFile>('media.files')
    .find({ 'metadata.tenantId': tenantId })
    .sort({ uploadDate: -1 })
    .limit(500)
    .toArray();
}

/** Where the back office and the website's build fetch an image. */
export function mediaPath(id: ObjectId | string): string {
  return `/api/public/media/${id}`;
}
