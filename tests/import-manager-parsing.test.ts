import { describe, it, expect } from 'vitest';
import { Parser } from '../server/src/utils/Parser';

describe('ImportManager Parsing Logic', () => {
  it('identifies the flaw and verifies the fallback using Parser.parseDirectory', () => {
    const filename = 'S01E01.mkv';
    const torrentName = 'Archer.S01.1080p';
    
    let parsed = Parser.parse(filename);
    let seriesTitle = parsed?.seriesTitle;
    
    expect(seriesTitle).toBeUndefined();
    
    // Fallback logic to be injected into ImportManager:
    if (parsed && !seriesTitle) {
      const torrentParsed = Parser.parse(torrentName);
      if (torrentParsed?.seriesTitle) {
        seriesTitle = torrentParsed.seriesTitle;
      } else {
        let dirTitle = Parser.parseDirectory(torrentName)?.title || torrentName;
        
        const seasonMatch = dirTitle.match(/(?:S\d{1,2}|Season\s*\d{1,2})\b/i);
        if (seasonMatch && seasonMatch.index !== undefined && seasonMatch.index > 0) {
           dirTitle = dirTitle.substring(0, seasonMatch.index);
        }
        
        const qualityMatch = dirTitle.search(/\d{3,4}p|BluRay|WEB|HDTV/i);
        if (qualityMatch > 0) {
           dirTitle = dirTitle.substring(0, qualityMatch);
        }
        
        seriesTitle = dirTitle.replace(/[._\- ]+$/, '').replace(/[._]/g, ' ').trim();
      }
    }
    
    expect(seriesTitle).toBe('Archer');
  });
});
