import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageBase64, imageUrl, apiKey } = await request.json();

    if (!apiKey?.trim()) {
      return NextResponse.json({ error: 'API ключ обов\'язковий' }, { status: 400 });
    }
    if (!imageBase64 && !imageUrl?.trim()) {
      return NextResponse.json({ error: 'Зображення обов\'язкове' }, { status: 400 });
    }

    const form = new FormData();
    form.append('size', 'auto');

    if (imageBase64) {
      const [header, b64data] = imageBase64.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
      const binary = atob(b64data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      form.append('image_file', blob, 'image.png');
    } else {
      form.append('image_url', imageUrl.trim());
    }

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey.trim() },
      body: form,
    });

    if (!res.ok) {
      let errMsg = `remove.bg error ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData.errors?.[0]?.title ?? errMsg;
      } catch {/* ignore */}

      if (res.status === 402) errMsg = 'Недостатньо кредитів — поповніть баланс на remove.bg';
      if (res.status === 403) errMsg = 'Невірний API ключ';
      if (res.status === 429) errMsg = 'Перевищено ліміт запитів — спробуйте пізніше';

      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    return NextResponse.json({ image: `data:image/png;base64,${base64}` });
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
