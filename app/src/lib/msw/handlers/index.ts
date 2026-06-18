import { type RequestHandler } from 'msw';
import type { FactoryMode } from '../factories';
import { createCoreHandlers } from './core';
import { createPlaybackHandlers } from './playback';
import { createRemainingHandlers } from './remaining';
import { createSettingsHandlers } from './settings';
import { createSubtitleHandlers } from './subtitles';
import { createSystemHandlers } from './system';
import { createSchedulerHandlers } from './scheduler';

export function createHandlers(mode: FactoryMode = 'deterministic'): RequestHandler[] {
  // Domain order matters only in that literal paths must precede parameterized
  // catch-all paths within each domain. Each create*Handlers factory places
  // literal routes before parameterized ones; the flat concatenation below
  // preserves that ordering.
  return [
    ...createCoreHandlers(mode),
    ...createSettingsHandlers(mode),
    ...createSystemHandlers(mode),
    ...createSchedulerHandlers(),
    ...createSubtitleHandlers(mode),
    ...createPlaybackHandlers(),
    ...createRemainingHandlers(mode),
  ];
}

export const handlers = createHandlers('deterministic');
