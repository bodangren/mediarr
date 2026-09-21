import { describe, expect, it } from 'vitest';
import { resolveSlimConfig } from './slim';

describe('resolveSlimConfig', () => {
  it('defaults to full-stack behaviour (slim disabled)', () => {
    expect(resolveSlimConfig({})).toEqual({ slim: false });
  });

  it.each(['true', '1', 'YES', 'on'])('accepts explicit opt-in value %s', (value) => {
    expect(resolveSlimConfig({ MEDIARR_SLIM_MODE: value })).toEqual({ slim: true });
  });

  it.each(['false', '0', 'no', 'off', ''])('rejects opt-out value %j', (value) => {
    expect(resolveSlimConfig({ MEDIARR_SLIM_MODE: value })).toEqual({ slim: false });
  });

  it('ignores surrounding whitespace', () => {
    expect(resolveSlimConfig({ MEDIARR_SLIM_MODE: '  true  ' })).toEqual({ slim: true });
  });
});
