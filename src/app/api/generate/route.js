import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const generationConfig = {
  temperature: 1,
  max_output_tokens: 32768,
};

export async function POST(request) {
  try {
    const { apiKey, prompt } = await request.json();

    if (!apiKey || !prompt) {
      return NextResponse.json({ error: 'apiKey and prompt are required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const interaction = await ai.interactions.create({
      model: 'models/gemini-2.5-flash-image',
      input: prompt,
      generation_config: generationConfig,
      response_modalities: ['image', 'text'],
    });

    if (interaction.output_image?.data) {
      return NextResponse.json({
        data: interaction.output_image.data,
        mime_type: interaction.output_image.mime_type ?? 'image/jpeg',
      });
    }

    return NextResponse.json(
      { error: interaction.output_text ?? 'Модель не повернула зображення.' },
      { status: 422 }
    );
  } catch (e) {
    const msg = e?.message ?? String(e);
    const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
    return NextResponse.json(
      { error: isQuota ? 'QUOTA' : msg },
      { status: isQuota ? 429 : 500 }
    );
  }
}
