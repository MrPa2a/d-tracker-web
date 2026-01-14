import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Infinity as InfinityIcon, 
  TrendingUp, 
  SlidersHorizontal,
  Calculator,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface LevelingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LevelingInfoModal: React.FC<LevelingInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-secondary rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-normal flex items-center justify-between bg-bg-tertiary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calculator className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">
              Comment fonctionne l'optimiseur ?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Introduction */}
          <section>
            <p className="text-text-secondary leading-relaxed">
              L'optimiseur de leveling calcule le <strong className="text-text-primary">chemin le moins cher</strong> pour 
              monter un métier du niveau A au niveau B. Il analyse toutes les recettes disponibles, leurs coûts 
              d'ingrédients actuels sur l'HDV, et l'XP gagnée à chaque craft.
            </p>
          </section>

          {/* Algorithm explanation */}
          <section className="bg-bg-tertiary/30 rounded-lg p-4 border border-border-normal">
            <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Calculator size={18} className="text-blue-400" />
              Algorithme de base
            </h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>Pour chaque niveau, l'algorithme :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Calcule l'XP nécessaire pour passer au niveau suivant</li>
                <li>Évalue le <strong className="text-text-primary">coût par XP</strong> de chaque recette craftable</li>
                <li>Sélectionne la recette avec le meilleur ratio coût/XP</li>
                <li>Répète jusqu'à atteindre le niveau cible</li>
              </ol>
              <p className="mt-3 text-xs text-text-tertiary">
                L'XP excédentaire d'un niveau est reportée au niveau suivant (pas de perte).
              </p>
            </div>
          </section>

          {/* Modes explanation */}
          <section>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Les 3 modes de calcul</h3>
            
            {/* Optimal */}
            <div className="mb-4 p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-600 rounded">
                  <InfinityIcon size={14} className="text-white" />
                </div>
                <h4 className="font-semibold text-blue-400">Mode Optimal</h4>
              </div>
              <p className="text-sm text-text-secondary mb-3">
                Le chemin <strong className="text-text-primary">mathématiquement parfait</strong>, sans aucune contrainte.
                Toutes les recettes sont considérées, quel que soit l'écart de niveau.
              </p>
              <div className="space-y-1">
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-text-secondary">Coût le plus bas théoriquement possible</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-text-secondary">Idéal pour estimer le budget minimum</span>
                </div>
                <div className="flex items-start gap-2 text-xs mt-1">
                  <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-text-secondary">
                    Peut recommander des milliers de crafts d'une même recette bas niveau
                    (irréaliste si les ressources ne sont pas disponibles en HDV)
                  </span>
                </div>
              </div>
            </div>

            {/* Réaliste */}
            <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-600 rounded">
                  <TrendingUp size={14} className="text-white" />
                </div>
                <h4 className="font-semibold text-amber-400">Mode Réaliste</h4>
              </div>
              <p className="text-sm text-text-secondary mb-3">
                Simule les <strong className="text-text-primary">contraintes réelles de l'HDV</strong> : 
                hausse des prix quand on achète en quantité, épuisement des stocks, et diversification forcée.
              </p>
              
              <div className="space-y-3 mt-4">
                <div className="bg-bg-tertiary/50 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-text-primary">Pénalité progressive</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Plus on achète une ressource, plus son prix effectif augmente 
                    (simulation de l'achat des lots de plus en plus chers sur l'HDV).
                  </p>
                  <code className="text-xs text-amber-400 mt-2 block">
                    prix_effectif = prix_base × (1 + α × quantité_achetée / seuil)
                  </code>
                </div>
                
                <div className="bg-bg-tertiary/50 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-text-primary">Épuisement des stocks</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Chaque ressource a un quota maximum. Une fois atteint, toutes les recettes 
                    utilisant cette ressource sont exclues, forçant la diversification.
                  </p>
                </div>

                <div className="bg-bg-tertiary/50 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-text-primary">Lot minimum & dernier niveau</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Pour éviter les micro-changements de recette, un lot minimum est appliqué 
                    (10 à 75 crafts selon le mode). <strong className="text-text-primary">Exception :</strong> au dernier niveau 
                    avant l'objectif, ce minimum est désactivé pour ne pas gaspiller de kamas en XP inutile.
                  </p>
                </div>

                <div className="bg-bg-tertiary/50 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-text-primary">Filtre de niveau</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Les recettes trop éloignées du niveau actuel (écart &gt; 50 niveaux) sont exclues : 
                    l'XP gagnée devient négligeable et c'est irréaliste de crafter du bas niveau à haut niveau.
                  </p>
                </div>
              </div>

              {/* Penalty levels */}
              <div className="mt-4 pt-3 border-t border-amber-500/20">
                <p className="text-xs font-medium text-text-primary mb-2">Niveaux de pénalité :</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-bg-tertiary/50 rounded p-2">
                    <span className="text-green-400 font-medium">Faible</span>
                    <p className="text-text-tertiary mt-1">HDV bien fourni</p>
                    <p className="text-text-tertiary">α=0.3 / seuil=3000</p>
                    <p className="text-text-tertiary">Stock max : 8000</p>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded p-2">
                    <span className="text-yellow-400 font-medium">Modérée</span>
                    <p className="text-text-tertiary mt-1">HDV standard</p>
                    <p className="text-text-tertiary">α=0.5 / seuil=2000</p>
                    <p className="text-text-tertiary">Stock max : 5000</p>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded p-2">
                    <span className="text-red-400 font-medium">Importante</span>
                    <p className="text-text-tertiary mt-1">HDV peu fourni</p>
                    <p className="text-text-tertiary">α=0.8 / seuil=1200</p>
                    <p className="text-text-tertiary">Stock max : 3000</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personnalisé */}
            <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-600 rounded">
                  <SlidersHorizontal size={14} className="text-white" />
                </div>
                <h4 className="font-semibold text-purple-400">Mode Personnalisé</h4>
              </div>
              <p className="text-sm text-text-secondary mb-3">
                Contrôle <strong className="text-text-primary">total</strong> sur tous les paramètres de calcul.
                Combinez une limite de crafts par recette avec la simulation HDV personnalisée.
              </p>
              
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle2 size={14} className="text-purple-400 mt-0.5 shrink-0" />
                  <span className="text-text-secondary">
                    <strong className="text-text-primary">Limite par recette :</strong> nombre max de crafts par recette (0 = illimité)
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle2 size={14} className="text-purple-400 mt-0.5 shrink-0" />
                  <span className="text-text-secondary">
                    <strong className="text-text-primary">Simulation HDV :</strong> activez pour configurer les pénalités manuellement
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-purple-500/20 text-xs text-text-tertiary space-y-1">
                <p><strong className="text-text-secondary">Alpha (α)</strong> : coefficient d'augmentation des prix (0 à 2)</p>
                <p><strong className="text-text-secondary">Seuil</strong> : quantité à partir de laquelle le prix a augmenté de α×100%</p>
                <p><strong className="text-text-secondary">Lot minimum</strong> : crafts minimum avant de changer de recette</p>
                <p><strong className="text-text-secondary">Stock max</strong> : quota max par ressource avant épuisement</p>
                <div className="mt-2 p-2 bg-purple-500/10 rounded text-text-secondary italic">
                  <strong>Exemple :</strong> avec α=0.5 et seuil=2000, après avoir acheté 2000 unités d'une ressource, 
                  son prix moyen aura augmenté de +50%. À 4000 unités, +100%, etc.
                </div>
              </div>
            </div>
          </section>

          {/* Recommendations */}
          <section className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
            <h3 className="text-lg font-semibold text-text-primary mb-3">💡 Recommandations</h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Utilisez le mode <strong className="text-blue-400">Optimal</strong> pour connaître le coût minimum théorique</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>Utilisez le mode <strong className="text-amber-400">Réaliste</strong> pour une estimation proche de la réalité HDV</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                <span>Utilisez le mode <strong className="text-purple-400">Personnalisé</strong> si vous voulez contrôler précisément la diversification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>Le <strong className="text-text-primary">surcoût affiché</strong> entre modes vous aide à décider si la diversification vaut le coup</span>
              </li>
            </ul>
          </section>

          {/* Comparison table */}
          <section className="bg-bg-tertiary/20 rounded-lg p-4 border border-border-normal">
            <h3 className="text-lg font-semibold text-text-primary mb-3">📊 Comparatif rapide</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-normal">
                    <th className="text-left py-2 text-text-secondary font-medium">Critère</th>
                    <th className="text-center py-2 text-blue-400 font-medium">Optimal</th>
                    <th className="text-center py-2 text-amber-400 font-medium">Réaliste</th>
                    <th className="text-center py-2 text-purple-400 font-medium">Personnalisé</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  <tr className="border-b border-border-normal/50">
                    <td className="py-2">Coût estimé</td>
                    <td className="text-center py-2">Le plus bas</td>
                    <td className="text-center py-2">+20 à 50%</td>
                    <td className="text-center py-2">Selon config</td>
                  </tr>
                  <tr className="border-b border-border-normal/50">
                    <td className="py-2">Recettes utilisées</td>
                    <td className="text-center py-2">1-3</td>
                    <td className="text-center py-2">5-15</td>
                    <td className="text-center py-2">Selon limite</td>
                  </tr>
                  <tr className="border-b border-border-normal/50">
                    <td className="py-2">Limite par recette</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2">✅ Configurable</td>
                  </tr>
                  <tr className="border-b border-border-normal/50">
                    <td className="py-2">Simulation prix HDV</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2">✅ Preset</td>
                    <td className="text-center py-2">⚙️ Optionnel</td>
                  </tr>
                  <tr className="border-b border-border-normal/50">
                    <td className="py-2">Paramètres ajustables</td>
                    <td className="text-center py-2">❌</td>
                    <td className="text-center py-2">3 niveaux</td>
                    <td className="text-center py-2">✅ Tous</td>
                  </tr>
                  <tr>
                    <td className="py-2">Cas d'usage</td>
                    <td className="text-center py-2">Budget min</td>
                    <td className="text-center py-2">Estimation réelle</td>
                    <td className="text-center py-2">Experts</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="text-xs text-text-tertiary border-t border-border-normal pt-4">
            <p>
              <strong>Note :</strong> Les prix utilisés sont basés sur les dernières observations HDV enregistrées. 
              Les coûts réels peuvent varier selon la disponibilité des ressources et les fluctuations du marché.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-normal bg-bg-tertiary/30">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
