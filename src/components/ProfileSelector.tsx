import React, { useState, useEffect } from 'react';
import type { Profile } from '../types';
import { fetchProfiles, createProfile } from '../api';

interface ProfileSelectorProps {
  currentProfile: Profile | null;
  onSelectProfile: (profile: Profile | null) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ currentProfile, onSelectProfile }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const data = await fetchProfiles();
        setProfiles(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to load profiles', err);
      }
    };
    loadProfiles();
  }, []);

  const handleCreate = async () => {
    if (!newProfileName.trim() || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const newProfile = await createProfile(newProfileName);
      setProfiles([...profiles, newProfile].sort((a, b) => a.name.localeCompare(b.name)));
      onSelectProfile(newProfile);
      setIsCreating(false);
      setNewProfileName('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur inconnue est survenue');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-3 bg-bg-secondary/30 rounded-lg border border-white/5">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Profil
        </label>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="text-xs text-accent-primary hover:text-accent-secondary transition-colors cursor-pointer"
            title="Créer un profil"
          >
            + Nouveau
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Nom du profil..."
            className="w-full bg-bg-primary border border-border-normal rounded px-2 py-1 text-sm text-text-primary focus:border-accent-primary outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setIsCreating(false);
                setError(null);
              }
            }}
          />
          {error && <span className="text-xs text-red-400">{error}</span>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setIsCreating(false);
                setError(null);
              }}
              disabled={isSubmitting}
              className="text-xs text-text-muted hover:text-text-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="text-xs bg-accent-primary/20 text-accent-primary px-2 py-1 rounded hover:bg-accent-primary/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </button>
          </div>
        </div>
      ) : (
        <select
          value={currentProfile?.id || ''}
          onChange={(e) => {
            const val = e.target.value;
            if (!val) {
              onSelectProfile(null);
            } else {
              const p = profiles.find((p) => p.id === val);
              if (p) onSelectProfile(p);
            }
          }}
          className="w-full bg-bg-primary border border-border-normal rounded px-2 py-1.5 text-sm text-text-primary focus:border-accent-primary outline-none appearance-none cursor-pointer"
        >
          <option value="">Local (Défaut)</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
