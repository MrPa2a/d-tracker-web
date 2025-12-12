import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Profile } from '../types';
import { fetchProfiles, createProfile, deleteProfile } from '../api';
import { ChevronDown, Trash2, AlertTriangle } from 'lucide-react';

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
  
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleDeleteClick = (e: React.MouseEvent, profile: Profile) => {
    e.stopPropagation();
    setProfileToDelete(profile);
    setIsDropdownOpen(false);
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteProfile(profileToDelete.id);
      setProfiles(profiles.filter(p => p.id !== profileToDelete.id));
      if (currentProfile?.id === profileToDelete.id) {
        onSelectProfile(null);
      }
      setProfileToDelete(null);
    } catch (err) {
      console.error('Failed to delete profile', err);
      alert('Erreur lors de la suppression du profil');
    } finally {
      setIsDeleting(false);
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
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-bg-primary border border-border-normal rounded px-2 py-1.5 text-sm text-text-primary focus:border-accent-primary outline-none cursor-pointer flex justify-between items-center hover:border-white/20 transition-colors"
          >
            <span className="truncate">{currentProfile?.name || 'Local (Défaut)'}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-full max-h-60 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-xl z-50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <button
                className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors ${!currentProfile ? 'text-blue-400 bg-blue-500/10' : 'text-gray-200'}`}
                onClick={() => {
                  onSelectProfile(null);
                  setIsDropdownOpen(false);
                }}
              >
                Local (Défaut)
              </button>
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors group cursor-pointer ${currentProfile?.id === p.id ? 'text-blue-400 bg-blue-500/10' : 'text-gray-200'}`}
                  onClick={() => {
                    onSelectProfile(p);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="truncate">{p.name}</span>
                  <button
                    onClick={(e) => handleDeleteClick(e, p)}
                    className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                    title="Supprimer le profil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {profileToDelete && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]" onClick={() => !isDeleting && setProfileToDelete(null)}>
          <div className="bg-bg-secondary p-6 rounded-lg w-full max-w-md border border-border-normal shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Supprimer le profil ?</h3>
            </div>
            
            <p className="text-text-primary mb-4">
              Vous êtes sur le point de supprimer le profil <span className="font-bold text-white">{profileToDelete.name}</span>.
            </p>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-6">
              <p className="text-sm text-red-200 font-medium mb-1">ATTENTION : Cette action est irréversible.</p>
              <ul className="text-sm text-red-300 list-disc list-inside">
                <li>Le profil sera définitivement supprimé</li>
                <li>Toutes les listes associées seront supprimées</li>
                <li>Tous les favoris associés seront supprimés</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setProfileToDelete(null)} 
                disabled={isDeleting}
                className="px-4 py-2 text-text-muted hover:text-text-primary disabled:opacity-50"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Supprimer définitivement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
