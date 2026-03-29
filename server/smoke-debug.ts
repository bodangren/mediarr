import { generateText, Output } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

const TestSchema = z.object({
  title: z.string(),
  type: z.enum(['series', 'movie']),
});

async function main() {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  const model = openrouter(process.env.OPENROUTER_MODEL ?? 'minimax/minimax-m2.7');

  console.log(`Testing generateText + Output.object with OpenRouter (${process.env.OPENROUTER_MODEL ?? 'minimax/minimax-m2.7'})...\n`);

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: TestSchema }),
      prompt: 'Parse: Breaking.Bad.S03E05.1080p.BluRay.mkv',
      abortSignal: AbortSignal.timeout(30000),
    });
    console.log('SUCCESS:', output);
  } catch (err) {
    console.log('ERROR:', err);
    if (err instanceof Error) {
      console.log('Message:', err.message);
      console.log('Stack:', err.stack);
    }
  }
}

main();
