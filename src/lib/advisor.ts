import type { MLCEngineInterface } from '@mlc-ai/web-llm';

export interface AdvisorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdvisorContext {
  summary: string;
}

const modelId = 'SmolLM2-360M-Instruct-q4f16_1-MLC';
let enginePromise: Promise<MLCEngineInterface> | null = null;

const systemPrompt = `You are NataGuide, a concise financial education assistant inside nataCONNECT.
Give practical, cautious steps and ask for missing non-sensitive numbers when useful.
Never claim to be a fiduciary, bank, lawyer, or licensed financial adviser.
Never request passwords, full card numbers, authentication codes, government IDs, or seed phrases.
Do not promise investment returns. For suspected fraud, prioritize stopping payment, contacting the bank through an official channel, preserving evidence, and reporting it.
Keep answers under 220 words and clearly distinguish education from professional advice.`;

function offlineAdvice(question: string, context?: AdvisorContext) {
  const text = question.toLowerCase();
  if ((text.includes('latest') || text.includes('payment') || text.includes('decision')) && context?.summary.includes('Latest decision:')) {
    const latest = context.summary.split('\n').find(line => line.startsWith('Latest decision:'));
    return `${latest}\n\nReview the listed evidence in Decision Shield. If the recommendation is block, verify the seller through a separately sourced official channel before doing anything else.`;
  }
  if (text.includes('debt') || text.includes('loan') || text.includes('credit')) {
    return 'Start by listing each balance, interest rate, and minimum payment. Keep minimums current, preserve a small emergency buffer, then direct extra cash to the highest-interest debt. I can help turn those numbers into a monthly plan.';
  }
  if (text.includes('budget') || text.includes('spend')) {
    return 'Review the last 30 days and separate essentials, commitments, goals, and flexible spending. Set realistic category limits and automate transfers to protected goals on payday. Leave a small buffer so the plan can survive an imperfect month.';
  }
  if (text.includes('invest') || text.includes('stock') || text.includes('crypto')) {
    return 'Build emergency savings first, diversify, keep fees low, and never invest money needed soon. Use the Practice tab to test position sizing without risking real funds. Investment returns are uncertain, so avoid plans that depend on a specific gain.';
  }
  if (text.includes('save') || text.includes('goal') || text.includes('emergency')) {
    return 'Choose a target amount and date, divide the remaining amount by the pay periods left, and automate that contribution. Protect the transfer from everyday spending and adjust the deadline if the required monthly amount is unrealistic.';
  }
  if (text.includes('scam') || text.includes('fraud') || text.includes('suspicious')) {
    return 'Do not send money or share codes. Verify the sender through a separately sourced official number or website, preserve screenshots, and contact your bank immediately if payment details were exposed. Add a Shield rule for the pattern you encountered.';
  }
  return 'I can help with budgeting, debt payoff, savings goals, scam safety, and investment education. Share the goal, timeframe, and approximate numbers you are comfortable using. Do not include passwords, card numbers, or other sensitive identifiers.';
}

async function getEngine(onProgress?: (progress: string) => void) {
  if (!('gpu' in navigator)) throw new Error('WebGPU is not available');
  if (!enginePromise) {
    enginePromise = import('@mlc-ai/web-llm').then(({ CreateMLCEngine }) => CreateMLCEngine(modelId, {
      initProgressCallback: progress => onProgress?.(progress.text),
    }));
  }
  return enginePromise;
}

export async function askAdvisor(messages: AdvisorMessage[], context?: AdvisorContext, onProgress?: (progress: string) => void) {
  try {
    const engine = await getEngine(onProgress);
    const completion = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: `${systemPrompt}\n\nCurrent local app context:\n${context?.summary || 'No dashboard context is available.'}` },
        ...messages.slice(-8),
      ],
      temperature: 0.3,
      max_tokens: 350,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Local model returned no response');
    return { content, source: 'Local open-source AI' as const };
  } catch {
    return { content: offlineAdvice(messages[messages.length - 1]?.content || '', context), source: 'Instant offline guide' as const };
  }
}
