export async function callOpenAI(params: {
  systemPrompt: string;
  userPrompt: string;
  apiKey?: string;
  model?: string;
}): Promise<string> {
  const apiKey = params.apiKey || process.env.OPENAI_API_KEY || '';
  if (!apiKey || apiKey.includes('your-openai-api-key')) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in your environment.');
  }

  const model = params.model || process.env.AI_MODEL || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty completion.');
  }

  return content;
}
