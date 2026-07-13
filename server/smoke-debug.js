import { generateText, Output } from 'ai';
import { z } from 'zod';
import { resolveReleaseParserAiConfig } from './src/services/ReleaseParserProvider';
const TestSchema = z.object({
    title: z.string(),
    type: z.enum(['series', 'movie']),
});
async function main() {
    const aiConfig = resolveReleaseParserAiConfig();
    if (!aiConfig.enabled) {
        console.log('No AI provider configured. Set AI_GATEWAY_BASE_URL + AI_GATEWAY_MODEL or OPENROUTER_API_KEY.');
        process.exit(1);
    }
    console.log(`Testing generateText + Output.object with ${aiConfig.description}...\n`);
    try {
        const { output } = await generateText({
            model: aiConfig.model,
            output: Output.object({ schema: TestSchema }),
            prompt: 'Parse: Breaking.Bad.S03E05.1080p.BluRay.mkv',
            ...(aiConfig.providerOptions ? { providerOptions: aiConfig.providerOptions } : {}),
            abortSignal: AbortSignal.timeout(30000),
        });
        console.log('SUCCESS:', output);
    }
    catch (err) {
        console.log('ERROR:', err);
        if (err instanceof Error) {
            console.log('Message:', err.message);
            console.log('Stack:', err.stack);
        }
    }
}
main();
//# sourceMappingURL=smoke-debug.js.map