export async function generateBackground(apiKey, prompt) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, prompt }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429 || data.error === 'QUOTA') throw new Error('QUOTA');
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  return `data:${data.mime_type};base64,${data.data}`;
}
