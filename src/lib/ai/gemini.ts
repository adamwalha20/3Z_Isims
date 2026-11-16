export async function callGemini(params: {
  systemPrompt: string;
  userPrompt: string;
  apiKey?: string;
  model?: string;
}): Promise<string> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey.includes('your-gemini-api-key')) {
    throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in your environment.');
  }

  const model = params.model || process.env.AI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: params.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: params.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response candidate.');
  }

  return text;
}
