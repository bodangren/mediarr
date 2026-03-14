
import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { LanguageSelector } from './LanguageSelector';
import { LanguageSettingRow } from './LanguageSettingRow';
import type { LanguageProfile, LanguageSetting, LanguageProfileInput } from '@/lib/api/languageProfilesApi';
import { getLanguageName } from '@/lib/constants/languages';

export interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: LanguageProfileInput) => Promise<void>;
  profile?: LanguageProfile; // undefined for create mode
  isLoading?: boolean;
}

function getInitialLanguages(profile?: LanguageProfile): LanguageSetting[] {
  if (profile?.languages) {
    return [...profile.languages];
  }
  return [];
}

function getInitialCutoff(profile?: LanguageProfile): string {
  return profile?.cutoff ?? '';
}

function getInitialUpgradeAllowed(profile?: LanguageProfile): boolean {
  return profile?.upgradeAllowed ?? false;
}

export function ProfileEditorModal({
  isOpen,
  onClose,
  onSave,
  profile,
  isLoading = false,
}: ProfileEditorModalProps) {
  const [name, setName] = useState('');
  const [languages, setLanguages] = useState<LanguageSetting[]>([]);
  const [cutoff, setCutoff] = useState('');
  const [upgradeAllowed, setUpgradeAllowed] = useState(false);
  const [mustContain, setMustContain] = useState('');
  const [mustNotContain, setMustNotContain] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [nameError, setNameError] = useState('');
  const [languagesError, setLanguagesError] = useState('');
  const [cutoffError, setCutoffError] = useState('');

  // Initialize form when profile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(profile?.name ?? '');
      setLanguages(getInitialLanguages(profile));
      setCutoff(getInitialCutoff(profile));
      setUpgradeAllowed(getInitialUpgradeAllowed(profile));
      setMustContain(profile?.mustContain?.join(', ') ?? '');
      setMustNotContain(profile?.mustNotContain?.join(', ') ?? '');
      setSelectedLanguage('');
      setNameError('');
      setLanguagesError('');
      setCutoffError('');
    }
  }, [isOpen, profile]);

  const getSelectedLanguageCodes = () => languages.map(lang => lang.languageCode);

  const handleAddLanguage = () => {
    if (!selectedLanguage || getSelectedLanguageCodes().includes(selectedLanguage)) {
      return;
    }

    const newLanguage: LanguageSetting = {
      languageCode: selectedLanguage,
      isForced: false,
      isHi: false,
      audioExclude: false,
      score: 0,
    };

    setLanguages([...languages, newLanguage]);
    setSelectedLanguage('');

    // If this is the first language and cutoff is empty, set it
    if (languages.length === 0 && !cutoff) {
      setCutoff(selectedLanguage);
    }
  };

  const handleLanguageChange = (index: number, setting: LanguageSetting) => {
    const newLanguages = [...languages];
    newLanguages[index] = setting;
    setLanguages(newLanguages);
  };

  const handleRemoveLanguage = (index: number) => {
    const removedLanguage = languages[index];
    const newLanguages = languages.filter((_, i) => i !== index);
    setLanguages(newLanguages);

    // If cutoff was set to the removed language, clear it or set to first remaining
    if (cutoff === removedLanguage.languageCode) {
      setCutoff(newLanguages.length > 0 ? newLanguages[0].languageCode : '');
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Profile name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    if (languages.length === 0) {
      setLanguagesError('At least one language is required');
      isValid = false;
    } else {
      setLanguagesError('');
    }

    if (cutoff && !getSelectedLanguageCodes().includes(cutoff)) {
      setCutoffError('Cutoff must be one of the selected languages');
      isValid = false;
    } else {
      setCutoffError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const input: LanguageProfileInput = {
      name: name.trim(),
      languages,
      cutoff: cutoff || undefined,
      upgradeAllowed,
    };

    await onSave(input);
  };

  const isEditMode = Boolean(profile);

  return (
    <Modal isOpen={isOpen} ariaLabel={isEditMode ? 'Edit Language Profile' : 'Add Language Profile'} onClose={onClose}>
      <ModalHeader
        title={isEditMode ? 'Edit Language Profile' : 'Add Language Profile'}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          {/* Profile Name */}
          <div>
            <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-text-primary">
              Profile Name <span className="text-accent-danger">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              disabled={isLoading}
              className={`w-full rounded-md border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                nameError ? 'border-accent-danger' : 'border-border-subtle'
              }`}
              placeholder="e.g., English, Spanish, French"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'name-error' : undefined}
            />
            {nameError && (
              <p id="name-error" className="mt-1 text-xs text-accent-danger">
                {nameError}
              </p>
            )}
          </div>

          {/* Languages */}
          <div>
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-medium text-text-primary">
                Languages <span className="text-accent-danger">*</span>
              </label>
              <LanguageSelector
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                exclude={getSelectedLanguageCodes()}
                label="Add Language"
                disabled={isLoading}
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleAddLanguage}
              disabled={!selectedLanguage || isLoading}
              className="mb-3"
            >
              Add Language
            </Button>

            {languagesError && (
              <p className="mb-2 text-xs text-accent-danger">{languagesError}</p>
            )}

            {/* Languages List */}
            {languages.length > 0 && (
              <div className="space-y-2">
                {languages.map((language, index) => (
                  <LanguageSettingRow
                    key={`${language.languageCode}-${index}`}
                    setting={language}
                    onChange={setting => handleLanguageChange(index, setting)}
                    onRemove={() => handleRemoveLanguage(index)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            )}

            {languages.length === 0 && (
              <p className="text-sm text-text-muted">No languages added yet. Select a language above and click "Add Language".</p>
            )}
          </div>

          {/* Cutoff */}
          <div>
            <label htmlFor="cutoff" className="mb-1 block text-sm font-medium text-text-primary">
              Cutoff Language
            </label>
            <select
              id="cutoff"
              value={cutoff}
              onChange={e => {
                setCutoff(e.target.value);
                if (cutoffError) setCutoffError('');
              }}
              disabled={languages.length === 0 || isLoading}
              className={`w-full rounded-md border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                cutoffError ? 'border-accent-danger' : 'border-border-subtle'
              }`}
              aria-invalid={Boolean(cutoffError)}
              aria-describedby={cutoffError ? 'cutoff-error' : undefined}
            >
              <option value="">No cutoff</option>
              {languages.map(lang => (
                <option key={lang.languageCode} value={lang.languageCode}>
                  {getLanguageName(lang.languageCode)} ({lang.languageCode})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              Subtitles with quality lower than this cutoff will be upgraded automatically if enabled.
            </p>
            {cutoffError && (
              <p id="cutoff-error" className="mt-1 text-xs text-accent-danger">
                {cutoffError}
              </p>
            )}
          </div>

          {/* Upgrade Allowed */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <input
                type="checkbox"
                checked={upgradeAllowed}
                onChange={e => setUpgradeAllowed(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-border-subtle bg-surface-2 text-accent-primary focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              Allow Upgrades
            </label>
            <p className="mt-1 text-xs text-text-muted">
              Automatically download better quality subtitles when available, respecting the cutoff language.
            </p>
          </div>

          {/* Must Contain */}
          <div>
            <label htmlFor="must-contain" className="mb-1 block text-sm font-medium text-text-primary">
              Must Contain
            </label>
            <input
              id="must-contain"
              type="text"
              value={mustContain}
              onChange={e => setMustContain(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g., BluRay, REMUX (comma-separated)"
            />
            <p className="mt-1 text-xs text-text-muted">
              Comma-separated list of release tags that subtitles must contain to be accepted.
            </p>
          </div>

          {/* Must Not Contain */}
          <div>
            <label htmlFor="must-not-contain" className="mb-1 block text-sm font-medium text-text-primary">
              Must Not Contain
            </label>
            <input
              id="must-not-contain"
              type="text"
              value={mustNotContain}
              onChange={e => setMustNotContain(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g., HC, HI (comma-separated)"
            />
            <p className="mt-1 text-xs text-text-text-muted">
              Comma-separated list of release tags that subtitles must not contain to be accepted.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Profile'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
