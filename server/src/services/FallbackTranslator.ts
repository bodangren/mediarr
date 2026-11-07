import type { Translator } from './MiniMaxTranslator';

/** Tries each translator in order; only throws when every provider fails. */
export class FallbackTranslator implements Translator {
  private readonly translators: Translator[];

  constructor(translators: Translator[]) {
    if (translators.length === 0) throw new Error('FallbackTranslator requires at least one translator');
    this.translators = translators;
  }

  async translate(cues: string[]): Promise<string[]> {
    const errors: string[] = [];
    for (const translator of this.translators) {
      try {
        return await translator.translate(cues);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(`all translators failed: ${errors.join(' | ')}`);
  }
}
