import { describe, expect, it } from 'vitest';
import { isArchiveVideoFile, parseNfo, syntheticVideoId } from './YoutubeArchiveImporter';

describe('isArchiveVideoFile', () => {
  it('accepts the archive containers and rejects sidecars', () => {
    expect(isArchiveVideoFile('027-ReactJS Tutorial.webm')).toBe(true);
    expect(isArchiveVideoFile('Episode.mkv')).toBe(true);
    expect(isArchiveVideoFile('Episode.mp4')).toBe(true);
    expect(isArchiveVideoFile('Episode-poster.jpg')).toBe(false);
    expect(isArchiveVideoFile('Episode.nfo')).toBe(false);
    expect(isArchiveVideoFile('.hidden.mp4')).toBe(false);
  });
});

describe('syntheticVideoId', () => {
  it('is deterministic and 11 characters', () => {
    const id = syntheticVideoId('CodeStoic/ReactJS Tutorial/001.webm');
    expect(id).toHaveLength(11);
    expect(id).toBe(syntheticVideoId('CodeStoic/ReactJS Tutorial/001.webm'));
    expect(id).not.toBe(syntheticVideoId('CodeStoic/ReactJS Tutorial/002.webm'));
  });
});

describe('parseNfo', () => {
  it('reads title and runtime in minutes', () => {
    const xml = '<?xml version="1.0"?><movie><title>027-ReactJS Tutorial 27： Handling Form Submission</title><runtime>4</runtime></movie>';
    expect(parseNfo(xml)).toEqual({ title: '027-ReactJS Tutorial 27： Handling Form Submission', runtimeMinutes: 4 });
  });

  it('decodes entities and tolerates missing fields', () => {
    expect(parseNfo('<movie><title>A &amp; B</title></movie>')).toEqual({ title: 'A & B', runtimeMinutes: null });
    expect(parseNfo('<movie></movie>')).toEqual({ title: null, runtimeMinutes: null });
    expect(parseNfo('<movie><runtime>0</runtime></movie>').runtimeMinutes).toBeNull();
  });
});
