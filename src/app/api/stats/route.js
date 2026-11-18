import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { statsPath, sanitizeEvent, blobAccess } from '../../../lib/stats';

const MAX_BODY_BYTES = 100 * 1024;

export async function POST(request) {
  // Not configured (local dev, tests, preview without Blob) — silently skip.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(null, { status: 204 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = sanitizeEvent(body);
  if (!event) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  try {
    await put(statsPath(event), JSON.stringify(event), {
      access: blobAccess(),
      contentType: 'application/json',
      addRandomSuffix: true,
    });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Storage error' }, { status: 502 });
  }
}
