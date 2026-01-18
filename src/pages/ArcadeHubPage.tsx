import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, Zap, Trophy, Users } from 'lucide-react';

interface ArcadeHubPageProps {
  server: string | null;
}

const games = [
  { 
    id: 'guess-item',
    name: "Devine l'Item", 
    path: "guess-item",
    description: "Identifie un item à partir de son icône",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
    category: "🧠 Quizz"
  },
  { 
    id: 'right-price',
    name: "Le Juste Prix", 
    path: "right-price",
    description: "Estime le prix actuel d'un item sur le marché",
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-500",
    category: "💰 Marché"
  },
  { 
    id: 'speed-market',
    name: "Speed Market", 
    path: "speed-market",
    description: "Classe les items du moins cher au plus cher",
    icon: Zap,
    color: "from-orange-500 to-amber-500",
    category: "💰 Marché"
  }
];

export const ArcadeHubPage = ({ server }: ArcadeHubPageProps) => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-2xl p-6 border border-accent-primary/30">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Bienvenue dans l'Arcade Hub!
            </h2>
            <p className="text-text-muted max-w-lg">
              Teste tes connaissances sur Dofus, défie tes amis et grimpe dans les classements. 
              Tous les jeux utilisent les données en temps réel du serveur <span className="text-accent-primary font-medium">{server || 'sélectionné'}</span>.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-bg-tertiary/50 rounded-lg">
              <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <span className="text-xs text-text-muted">Classements</span>
            </div>
            <div className="text-center px-4 py-2 bg-bg-tertiary/50 rounded-lg">
              <Users className="w-5 h-5 text-accent-primary mx-auto mb-1" />
              <span className="text-xs text-text-muted">Multijoueur</span>
            </div>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Jeux Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Link
              key={game.id}
              to={`/arcade/${game.path}`}
              className="group bg-bg-secondary border border-border-normal rounded-xl p-5 hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <game.icon size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
                      {game.category}
                    </span>
                  </div>
                  <h4 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                    {game.name}
                  </h4>
                  <p className="text-sm text-text-muted mt-1 line-clamp-2">
                    {game.description}
                  </p>
                </div>
              </div>
              
              {/* Stats placeholder */}
              <div className="mt-4 pt-4 border-t border-border-normal flex items-center justify-between text-xs text-text-muted">
                <span>🏆 Meilleur: --</span>
                <span className="text-accent-primary group-hover:translate-x-1 transition-transform">
                  Jouer →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-bg-tertiary/30 rounded-xl p-6 border border-dashed border-border-normal">
        <h3 className="text-lg font-semibold text-text-primary mb-2">🚧 Prochainement</h3>
        <p className="text-text-muted text-sm">
          D'autres mini-jeux arrivent bientôt : Panoplie Puzzle, Combo Memory, Dodle...
        </p>
      </div>
    </div>
  );
};