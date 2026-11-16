import { callOpenAI } from './openai';
import { callGemini } from './gemini';

export type AIProvider = 'openai' | 'gemini';

export async function executeAICompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  provider?: AIProvider;
  model?: string;
}): Promise<{ rawJsonText: string; provider: AIProvider; model: string }> {
  const configuredProvider =
    params.provider ||
    ((process.env.AI_PROVIDER?.toLowerCase() as AIProvider) || 'openai');

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-openai'));
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your-gemini'));

  let activeProvider: AIProvider = configuredProvider;
  if (configuredProvider === 'openai' && !hasOpenAI && hasGemini) {
    activeProvider = 'gemini';
  } else if (configuredProvider === 'gemini' && !hasGemini && hasOpenAI) {
    activeProvider = 'openai';
  }

  const model =
    params.model ||
    process.env.AI_MODEL ||
    (activeProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');

  if (activeProvider === 'gemini') {
    const rawJsonText = await callGemini({
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      model,
    });
    return { rawJsonText, provider: 'gemini', model };
  } else {
    const rawJsonText = await callOpenAI({
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      model,
    });
    return { rawJsonText, provider: 'openai', model };
  }
}
