import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createLanguageProfilesApi } from './languageProfilesApi';
describe('languageProfilesApi', () => {
    const mockClient = {
        request: vi.fn(),
    };
    const api = createLanguageProfilesApi(mockClient);
    beforeEach(() => {
        mockClient.request.mockClear();
    });
    describe('listProfiles', () => {
        it('should fetch all language profiles', async () => {
            const mockProfiles = [
                {
                    id: 1,
                    name: 'English Only',
                    languages: [
                        { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 100 },
                    ],
                    cutoff: 'en',
                    upgradeAllowed: false,
                    mustContain: [],
                    mustNotContain: [],
                },
                {
                    id: 2,
                    name: 'English + Spanish',
                    languages: [
                        { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 100 },
                        { languageCode: 'es', isForced: false, isHi: false, audioExclude: false, score: 80 },
                    ],
                    cutoff: 'en',
                    upgradeAllowed: true,
                    mustContain: [],
                    mustNotContain: ['ads'],
                },
            ];
            mockClient.request.mockResolvedValue(mockProfiles);
            const result = await api.listProfiles();
            expect(result).toEqual(mockProfiles);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles',
            }), expect.anything());
        });
        it('should return empty array when no profiles exist', async () => {
            mockClient.request.mockResolvedValue([]);
            const result = await api.listProfiles();
            expect(result).toEqual([]);
            expect(mockClient.request).toHaveBeenCalledTimes(1);
        });
    });
    describe('getProfile', () => {
        it('should fetch a single language profile by ID', async () => {
            const mockProfile = {
                id: 1,
                name: 'English Only',
                languages: [
                    { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 100 },
                ],
                cutoff: 'en',
                upgradeAllowed: false,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockProfile);
            const result = await api.getProfile(1);
            expect(result).toEqual(mockProfile);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles/1',
            }), expect.anything());
        });
        it('should request correct path for different IDs', async () => {
            const mockProfile = {
                id: 42,
                name: 'Test Profile',
                languages: [],
                cutoff: '',
                upgradeAllowed: false,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockProfile);
            await api.getProfile(42);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles/42',
            }), expect.anything());
        });
    });
    describe('createProfile', () => {
        it('should create a new language profile', async () => {
            const input = {
                name: 'New Profile',
                languages: [
                    { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 100 },
                ],
                cutoff: 'en',
                upgradeAllowed: true,
            };
            const mockResult = {
                id: 3,
                name: 'New Profile',
                languages: input.languages,
                cutoff: 'en',
                upgradeAllowed: true,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.createProfile(input);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles',
                method: 'POST',
                body: input,
            }), expect.anything());
        });
        it('should create profile with minimal input (only required fields)', async () => {
            const input = {
                name: 'Minimal Profile',
                languages: [
                    { languageCode: 'fr', isForced: false, isHi: false, audioExclude: false, score: 50 },
                ],
            };
            const mockResult = {
                id: 4,
                name: 'Minimal Profile',
                languages: input.languages,
                cutoff: '',
                upgradeAllowed: false,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.createProfile(input);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles',
                method: 'POST',
                body: input,
            }), expect.anything());
        });
        it('should create profile with multiple languages', async () => {
            const input = {
                name: 'Multi-language',
                languages: [
                    { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 100 },
                    { languageCode: 'de', isForced: false, isHi: true, audioExclude: false, score: 80 },
                    { languageCode: 'fr', isForced: true, isHi: false, audioExclude: true, score: 60 },
                ],
                cutoff: 'en',
                upgradeAllowed: true,
            };
            const mockResult = {
                id: 5,
                ...input,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.createProfile(input);
            expect(result.languages).toHaveLength(3);
            expect(result.languages[1].isHi).toBe(true);
            expect(result.languages[2].isForced).toBe(true);
            expect(result.languages[2].audioExclude).toBe(true);
        });
    });
    describe('updateProfile', () => {
        it('should update an existing language profile', async () => {
            const input = {
                name: 'Updated Profile',
                languages: [
                    { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 100 },
                    { languageCode: 'es', isForced: false, isHi: false, audioExclude: false, score: 90 },
                ],
                cutoff: 'en',
                upgradeAllowed: false,
            };
            const mockResult = {
                id: 1,
                name: 'Updated Profile',
                languages: input.languages,
                cutoff: 'en',
                upgradeAllowed: false,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.updateProfile(1, input);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles/1',
                method: 'PUT',
                body: input,
            }), expect.anything());
        });
        it('should update profile with partial input', async () => {
            const input = {
                name: 'Renamed Profile',
                languages: [
                    { languageCode: 'it', isForced: false, isHi: false, audioExclude: false, score: 75 },
                ],
            };
            const mockResult = {
                id: 2,
                name: 'Renamed Profile',
                languages: input.languages,
                cutoff: 'it',
                upgradeAllowed: true,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.updateProfile(2, input);
            expect(result.name).toBe('Renamed Profile');
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles/2',
                method: 'PUT',
            }), expect.anything());
        });
    });
    describe('deleteProfile', () => {
        it('should delete a language profile', async () => {
            const mockResult = { id: 1 };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.deleteProfile(1);
            expect(result).toEqual(mockResult);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles/1',
                method: 'DELETE',
            }), expect.anything());
        });
        it('should request correct path for different IDs', async () => {
            mockClient.request.mockResolvedValue({ id: 99 });
            await api.deleteProfile(99);
            expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/api/subtitles/language-profiles/99',
                method: 'DELETE',
            }), expect.anything());
        });
    });
    describe('schema validation', () => {
        it('should validate LanguageSetting with all fields', async () => {
            const languageSetting = {
                languageCode: 'en',
                isForced: true,
                isHi: true,
                audioExclude: true,
                score: 95,
            };
            const input = {
                name: 'Test',
                languages: [languageSetting],
            };
            const mockResult = {
                id: 1,
                name: 'Test',
                languages: [languageSetting],
                cutoff: '',
                upgradeAllowed: false,
                mustContain: [],
                mustNotContain: [],
            };
            mockClient.request.mockResolvedValue(mockResult);
            const result = await api.createProfile(input);
            expect(result.languages[0]).toEqual(languageSetting);
        });
        it('should handle profiles with mustContain and mustNotContain arrays', async () => {
            const mockProfile = {
                id: 1,
                name: 'Strict Profile',
                languages: [
                    { languageCode: 'en', isForced: false, isHi: false, audioExclude: false, score: 100 },
                ],
                cutoff: 'en',
                upgradeAllowed: false,
                mustContain: ['opensubtitles', 'subscene'],
                mustNotContain: ['ads', 'watermark'],
            };
            mockClient.request.mockResolvedValue(mockProfile);
            const result = await api.getProfile(1);
            expect(result.mustContain).toEqual(['opensubtitles', 'subscene']);
            expect(result.mustNotContain).toEqual(['ads', 'watermark']);
        });
    });
    describe('error handling', () => {
        it('should propagate errors from the client', async () => {
            const error = new Error('Network error');
            mockClient.request.mockRejectedValue(error);
            await expect(api.listProfiles()).rejects.toThrow('Network error');
        });
        it('should propagate not found errors', async () => {
            const error = new Error('Profile not found');
            mockClient.request.mockRejectedValue(error);
            await expect(api.getProfile(999)).rejects.toThrow('Profile not found');
        });
    });
});
//# sourceMappingURL=languageProfilesApi.test.js.map