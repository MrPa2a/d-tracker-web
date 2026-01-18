import type { Profile } from "../../types";
import { Sparkles, Play, Trophy, Clock } from 'lucide-react';

interface GuessItemPageProps {
  server: string | null;
  currentProfile: Profile | null;
}

export const GuessItemPage = ({ server, currentProfile }: GuessItemPageProps) => {
  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="bg-bg-secondary border border-border-normal rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
            <Sparkles size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                🧠 Quizz
              </span>
              <span className="text-xs text-text-muted">
                Serveur: {server || 'Non sélectionné'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-text-primary">Devine l'Item</h2>
            <p className="text-text-muted mt-1">
              Identifie un item à partir de son icône. Plus tu réponds vite, plus tu gagnes de points !
            </p>
          </div>
        </div>

        {/* Player info */}
        {currentProfile && (
          <div className="mt-4 pt-4 border-t border-border-normal flex items-center gap-2">
            <span className="text-sm text-text-muted">Joueur:</span>
            <span className="text-sm font-medium text-text-primary">{currentProfile.name}</span>
          </div>
        )}
      </div>

      {/* Game Area Placeholder */}
      <div className="bg-bg-secondary border border-border-normal rounded-xl p-8 min-h-[400px] flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-bg-tertiary flex items-center justify-center mx-auto">
            <Sparkles size={40} className="text-text-muted" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Prêt à jouer ?</h3>
            <p className="text-text-muted text-sm mt-1">Le jeu sera implémenté dans le Module 2</p>
          </div>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity">
            <Play size={20} />
            Commencer une partie
          </button>
        </div>
      </div>

      {/* Stats placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-secondary border border-border-normal rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400" size={24} />
            <div>
              <p className="text-xs text-text-muted">Meilleur score</p>
              <p className="text-lg font-bold text-text-primary">--</p>
            </div>
          </div>
        </div>
        <div className="bg-bg-secondary border border-border-normal rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="text-accent-primary" size={24} />
            <div>
              <p className="text-xs text-text-muted">Parties jouées</p>
              <p className="text-lg font-bold text-text-primary">0</p>
            </div>
          </div>
        </div>
        <div className="bg-bg-secondary border border-border-normal rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400" size={24} />
            <div>
              <p className="text-xs text-text-muted">Rang</p>
              <p className="text-lg font-bold text-text-primary">--</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};