import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Deployment check: is the database configured and reachable? Says what kind
 * of problem there is (never the connection string or any data).
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  if (!process.env.MONGODB_URI)
    return NextResponse.json(
      { status: 'error', database: 'not_configured', hint: 'Set MONGODB_URI in the site environment.' },
      { status: 503, headers },
    );
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const setupDone = (await db.collection('users').estimatedDocumentCount()) > 0;
    return NextResponse.json({ status: 'ok', database: 'connected', setupDone }, { headers });
  } catch (err) {
    const message = String((err as Error)?.message ?? '');
    const database = /auth|credential|password/i.test(message)
      ? 'auth_failed'
      : /ENOTFOUND|querySrv|Invalid scheme|URI/i.test(message)
        ? 'bad_uri'
        : 'unreachable';
    const hint = {
      auth_failed: 'Check the database user name and password in MONGODB_URI.',
      bad_uri: 'Check the MONGODB_URI value (copy it again from Atlas → Connect → Drivers).',
      unreachable: 'Allow 0.0.0.0/0 in Atlas → Network Access, and check the cluster is running.',
    }[database];
    return NextResponse.json({ status: 'error', database, hint }, { status: 503, headers });
  }
}
