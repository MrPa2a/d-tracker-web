import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Map,
  Loader2,
  Route,
  MapPin,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useHarvestJobs, useHarvestResources, useOptimizeRoute } from '../hooks/useHarvest';
import type { HarvestRouteStep, HarvestResource } from '../api';

/**
 * Génère les flèches de déplacement entre deux positions
 * @param fromX Position X de départ
 * @param fromY Position Y de départ
 * @param toX Position X d'arrivée
 * @param toY Position Y d'arrivée
 * @returns Un tableau de caractères flèches représentant le déplacement
 */
function getDirectionArrows(fromX: number, fromY: number, toX: number, toY: number): string[] {
  const arrows: string[] = [];
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  
  // Dans Dofus: +X = droite, -X = gauche, +Y = bas, -Y = haut
  if (deltaX > 0) {
    for (let i = 0; i < deltaX; i++) arrows.push('→');
  } else if (deltaX < 0) {
    for (let i = 0; i < Math.abs(deltaX); i++) arrows.push('←');
  }
  
  if (deltaY > 0) {
    for (let i = 0; i < deltaY; i++) arrows.push('↓');
  } else if (deltaY < 0) {
    for (let i = 0; i < Math.abs(deltaY); i++) arrows.push('↑');
  }
  
  return arrows;
}

export const HarvestRoutesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // État de configuration
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>(() => {
    const jobs = searchParams.get('jobs');
    return jobs ? jobs.split(',').map(Number).filter(Boolean) : [];
  });
  const [levelMin, setLevelMin] = useState<number>(() => {
    const min = searchParams.get('levelMin');
    return min ? parseInt(min) : 1;
  });
  const [levelMax, setLevelMax] = useState<number>(() => {
    const max = searchParams.get('levelMax');
    return max ? parseInt(max) : 200;
  });
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<number>>(() => {
    const res = searchParams.get('resources');
    return res ? new Set(res.split(',').map(Number).filter(Boolean)) : new Set();
  });
  const [maxMoves, setMaxMoves] = useState<number>(() => {
    const moves = searchParams.get('maxMoves');
    return moves ? parseInt(moves) : 20;
  });
  const [startX, setStartX] = useState<number>(() => {
    const x = searchParams.get('startX');
    return x ? parseInt(x) : 0;
  });
  const [startY, setStartY] = useState<number>(() => {
    const y = searchParams.get('startY');
    return y ? parseInt(y) : 0;
  });

  // Données et mutations
  const { data: jobs = [], isLoading: isLoadingJobs } = useHarvestJobs();
  const { data: resources = [], isFetching: isFetchingResources } = useHarvestResources(
    selectedJobIds,
    levelMin,
    levelMax
  );
  const optimizeMutation = useOptimizeRoute();

  // Cache des ressources par métier pour éviter le flash lors du chargement
  const [cachedResourcesByJob, setCachedResourcesByJob] = useState<globalThis.Map<number, HarvestResource[]>>(new globalThis.Map());

  // Grouper les ressources par métier et mettre en cache
  const resourcesByJob = useMemo(() => {
    const grouped = new globalThis.Map<number, HarvestResource[]>();
    resources.forEach((res) => {
      const list = grouped.get(res.job_id) || [];
      list.push(res);
      grouped.set(res.job_id, list);
    });
    return grouped;
  }, [resources]);

  // Mettre à jour le cache quand les ressources arrivent
  useEffect(() => {
    if (resources.length > 0) {
      setCachedResourcesByJob((prev) => {
        const newCache = new globalThis.Map(prev);
        resourcesByJob.forEach((resList, jobId) => {
          newCache.set(jobId, resList);
        });
        return newCache;
      });
    }
  }, [resources, resourcesByJob]);

  // Nettoyer le cache quand un métier est désélectionné
  useEffect(() => {
    setCachedResourcesByJob((prev) => {
      const newCache = new globalThis.Map<number, HarvestResource[]>();
      selectedJobIds.forEach((jobId) => {
        if (prev.has(jobId)) {
          newCache.set(jobId, prev.get(jobId)!);
        }
      });
      return newCache;
    });
  }, [selectedJobIds]);

  // Fusionner les données fraîches avec le cache pour l'affichage
  const displayResourcesByJob = useMemo(() => {
    const merged = new globalThis.Map<number, HarvestResource[]>();
    selectedJobIds.forEach((jobId) => {
      // Priorité aux données fraîches, sinon utiliser le cache
      if (resourcesByJob.has(jobId)) {
        merged.set(jobId, resourcesByJob.get(jobId)!);
      } else if (cachedResourcesByJob.has(jobId)) {
        merged.set(jobId, cachedResourcesByJob.get(jobId)!);
      }
    });
    return merged;
  }, [selectedJobIds, resourcesByJob, cachedResourcesByJob]);

  // Synchroniser tous les paramètres avec l'URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Jobs
    if (selectedJobIds.length > 0) {
      params.set('jobs', selectedJobIds.join(','));
    }
    
    // Niveaux (seulement si différents des valeurs par défaut)
    if (levelMin !== 1) {
      params.set('levelMin', levelMin.toString());
    }
    if (levelMax !== 200) {
      params.set('levelMax', levelMax.toString());
    }
    
    // Ressources
    if (selectedResourceIds.size > 0) {
      params.set('resources', Array.from(selectedResourceIds).join(','));
    }
    
    // Paramètres de route (seulement si différents des valeurs par défaut)
    if (maxMoves !== 20) {
      params.set('maxMoves', maxMoves.toString());
    }
    if (startX !== 0) {
      params.set('startX', startX.toString());
    }
    if (startY !== 0) {
      params.set('startY', startY.toString());
    }
    
    setSearchParams(params, { replace: true });
  }, [selectedJobIds, levelMin, levelMax, selectedResourceIds, maxMoves, startX, startY, setSearchParams]);

  // Auto-lancer l'optimisation au chargement si des ressources sont déjà sélectionnées depuis l'URL
  const [hasAutoOptimized, setHasAutoOptimized] = useState(false);
  useEffect(() => {
    // Attendre que les ressources soient chargées et qu'on n'ait pas déjà lancé l'auto-opti
    if (hasAutoOptimized) return;
    if (isFetchingResources) return;
    if (selectedResourceIds.size === 0) return;
    if (optimizeMutation.isPending || optimizeMutation.data) return;
    
    // Vérifier que les ressources sélectionnées existent bien dans les données chargées
    const validResourceIds = Array.from(selectedResourceIds).filter(id => 
      resources.some(r => r.id === id)
    );
    
    if (validResourceIds.length > 0) {
      setHasAutoOptimized(true);
      optimizeMutation.mutate({
        resourceIds: validResourceIds,
        startX,
        startY,
        maxMoves,
      });
    }
  }, [hasAutoOptimized, isFetchingResources, resources, selectedResourceIds, startX, startY, maxMoves, optimizeMutation]);

  // Calculer le détail des ressources sur le chemin (par type de ressource)
  // Inclut aussi les ressources sélectionnées mais non trouvées (count = 0)
  const resourcesDetailOnRoute = useMemo(() => {
    if (!optimizeMutation.data?.route) return { total: 0, byResource: [] as { id: number; name: string; icon_url: string | null; count: number }[] };
    
    const resourceCounts = new globalThis.Map<number, { name: string; icon_url: string | null; count: number }>();
    
    // D'abord, initialiser avec les ressources sélectionnées à 0
    selectedResourceIds.forEach((resId) => {
      const res = resources.find(r => r.id === resId);
      if (res) {
        resourceCounts.set(resId, { name: res.name_fr, icon_url: res.icon_url, count: 0 });
      }
    });
    
    // Ensuite, compter les ressources trouvées dans la route
    optimizeMutation.data.route.forEach((step) => {
      step.resources.forEach((res) => {
        const existing = resourceCounts.get(res.id);
        if (existing) {
          existing.count += res.count;
        } else {
          resourceCounts.set(res.id, { name: res.name, icon_url: res.icon_url, count: res.count });
        }
      });
    });
    
    const byResource = Array.from(resourceCounts.entries())
      .map(([id, { name, icon_url, count }]) => ({ id, name, icon_url, count }))
      .sort((a, b) => b.count - a.count); // Trier par quantité décroissante
    
    const total = byResource.reduce((sum, r) => sum + r.count, 0);
    
    return { total, byResource };
  }, [optimizeMutation.data, selectedResourceIds, resources]);

  // Handlers
  const toggleJob = (jobId: number) => {
    setSelectedJobIds((prev) => {
      const newIds = prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId];
      return newIds;
    });
    // Désélectionner les ressources du métier désélectionné
    setSelectedResourceIds((prev) => {
      const jobResources = resources.filter((r) => r.job_id === jobId);
      const newSet = new Set(prev);
      jobResources.forEach((r) => newSet.delete(r.id));
      return newSet;
    });
  };

  const toggleResource = (resourceId: number) => {
    setSelectedResourceIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resourceId)) {
        newSet.delete(resourceId);
      } else {
        newSet.add(resourceId);
      }
      return newSet;
    });
  };

  const selectAllResources = () => {
    setSelectedResourceIds(new Set(resources.map((r) => r.id)));
  };

  const clearAllResources = () => {
    setSelectedResourceIds(new Set());
  };

  const handleOptimize = () => {
    if (selectedResourceIds.size === 0) return;
    optimizeMutation.mutate({
      resourceIds: Array.from(selectedResourceIds),
      startX,
      startY,
      maxMoves,
    });
  };

  const formatDistance = (distance: number) => {
    return distance.toLocaleString('fr-FR');
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Map className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
          Optimiseur de Routes de Récolte
        </h1>
        <p className="text-sm md:text-base text-gray-400 mt-2">
          Créez des routes optimisées pour vos sessions de récolte multi-métiers.
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-medium text-white">Configuration</h2>
        </div>

        {/* Sélection des métiers */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Métiers de récolte
          </label>
          {isLoadingJobs ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement des métiers...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => toggleJob(job.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedJobIds.includes(job.id)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#25262b] text-gray-400 hover:bg-[#2c2d32] hover:text-white'
                  }`}
                >
                  {selectedJobIds.includes(job.id) && <Check className="w-3.5 h-3.5" />}
                  {job.name_fr}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filtres de niveau et paramètres */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Niveau min</label>
            <input
              type="number"
              min={1}
              max={levelMax}
              value={levelMin}
              onChange={(e) => setLevelMin(Number(e.target.value))}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Niveau max</label>
            <input
              type="number"
              min={levelMin}
              max={200}
              value={levelMax}
              onChange={(e) => setLevelMax(Number(e.target.value))}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Déplacements max</label>
            <input
              type="number"
              min={5}
              max={100}
              value={maxMoves}
              onChange={(e) => setMaxMoves(Number(e.target.value))}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Position départ X</label>
            <input
              type="number"
              value={startX}
              onChange={(e) => setStartX(Number(e.target.value))}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-400">Position départ Y</label>
            <input
              type="number"
              value={startY}
              onChange={(e) => setStartY(Number(e.target.value))}
              className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Sélection des ressources */}
        {selectedJobIds.length > 0 && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                Ressources ({selectedResourceIds.size} sélectionnées)
                {isFetchingResources && (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                )}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllResources}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Tout sélectionner
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={clearAllResources}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {selectedJobIds.map((jobId) => {
                const job = jobs.find((j) => j.id === jobId);
                const jobResources = displayResourcesByJob.get(jobId);
                const isJobLoading = !jobResources && isFetchingResources;
                
                return (
                  <div key={jobId}>
                    <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {job?.name_fr || `Métier ${jobId}`}
                      {isJobLoading && (
                        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                      )}
                    </h3>
                    {jobResources ? (
                      <div className="flex flex-wrap gap-2">
                        {jobResources.map((res) => (
                          <button
                            key={res.id}
                            onClick={() => toggleResource(res.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                              selectedResourceIds.has(res.id)
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
                                : 'bg-[#25262b] text-gray-400 hover:bg-[#2c2d32] hover:text-white border border-transparent'
                            }`}
                            title={`Niveau ${res.level_min}`}
                          >
                            {res.icon_url && (
                              <img
                                src={res.icon_url}
                                alt=""
                                className="w-4 h-4 object-contain"
                              />
                            )}
                            {res.name_fr}
                            <span className="text-[10px] text-gray-500 ml-1">
                              Nv.{res.level_min}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Chargement...</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bouton Optimiser */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleOptimize}
            disabled={selectedResourceIds.size === 0 || optimizeMutation.isPending}
            className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
              selectedResourceIds.size > 0 && !optimizeMutation.isPending
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {optimizeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Optimisation en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Optimiser la route
              </>
            )}
          </button>
        </div>
      </div>

      {/* Résultats */}
      {optimizeMutation.isError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Erreur lors de l'optimisation : {optimizeMutation.error.message}</span>
          </div>
        </div>
      )}

      {optimizeMutation.data && (
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl overflow-hidden">
          {/* En-tête des résultats */}
          <div className="p-4 border-b border-white/5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <Route className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-white">Route optimisée</h2>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-400">
                    <span className="text-white font-medium">
                      {resourcesDetailOnRoute.total}
                    </span>{' '}
                    ressources
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">
                    <span className="text-white font-medium">
                      {optimizeMutation.data.total_maps}
                    </span>{' '}
                    maps
                    <span className="text-gray-500 ml-1">
                      (sur {optimizeMutation.data.available_maps} disponibles)
                    </span>
                  </span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span className="text-gray-400">
                  Distance totale :{' '}
                  <span className="text-white font-medium">
                    {formatDistance(optimizeMutation.data.total_distance)}
                  </span>{' '}
                  cases
                </span>
              </div>
            </div>
            </div>
            
            {/* Détail des ressources par type */}
            {resourcesDetailOnRoute.byResource.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5 mt-3">
                <span className="text-xs text-gray-500">Récolte :</span>
                {resourcesDetailOnRoute.byResource.map((res) => {
                  const notFound = res.count === 0;
                  return (
                    <span
                      key={res.id}
                      className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                        notFound 
                          ? 'bg-red-600/10 text-red-400' 
                          : 'bg-emerald-600/10 text-emerald-400'
                      }`}
                      title={notFound ? 'Aucune ressource trouvée sur le chemin' : undefined}
                    >
                      {res.icon_url && (
                        <img src={res.icon_url} alt="" className="w-4 h-4 object-contain" />
                      )}
                      {res.name}
                      <span className={notFound ? 'text-red-600' : 'text-emerald-600'}>
                        ×{res.count}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Liste des étapes */}
          <div className="divide-y divide-white/5">
            {optimizeMutation.data.route.map((step: HarvestRouteStep, index: number) => {
              // Calculer les flèches de direction depuis la position précédente
              const prevStep = index > 0 ? optimizeMutation.data!.route[index - 1] : null;
              const fromX = prevStep ? prevStep.pos_x : startX;
              const fromY = prevStep ? prevStep.pos_y : startY;
              const arrows = step.distance_from_prev > 0 
                ? getDirectionArrows(fromX, fromY, step.pos_x, step.pos_y)
                : [];

              return (
                <div
                  key={`${step.map_id}-${index}`}
                  className="p-4 hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Numéro d'étape */}
                    <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
                      {step.order}
                    </div>

                  {/* Infos principales */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-medium">
                        [{step.pos_x}, {step.pos_y}]
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400 text-sm">{step.subarea_name}</span>
                    </div>

                    {/* Ressources sur cette map */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {step.resources.map((res) => (
                        <span
                          key={res.id}
                          className="px-2 py-0.5 bg-emerald-600/10 text-emerald-400 rounded text-xs flex items-center gap-1"
                        >
                          {res.icon_url && (
                            <img src={res.icon_url} alt="" className="w-4 h-4 object-contain" />
                          )}
                          {res.name}
                          <span className="text-emerald-600">×{res.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Distance et directions depuis la précédente */}
                  {step.distance_from_prev > 0 && (
                    <div className="shrink-0 text-right space-y-1">
                      <div className="text-xs text-gray-500">
                        +{step.distance_from_prev} cases
                      </div>
                      {/* Flèches de direction pour atteindre cette map */}
                      <div 
                        className="flex flex-wrap justify-end items-center gap-0.5 max-w-[140px]" 
                        title="Déplacements pour atteindre cette map"
                      >
                        <span className="text-[10px] text-gray-600 mr-1">trajet :</span>
                        {arrows.map((arrow, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              arrow === '→' ? 'text-blue-400' :
                              arrow === '←' ? 'text-orange-400' :
                              arrow === '↑' ? 'text-green-400' :
                              'text-purple-400'
                            }`}
                          >
                            {arrow}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* État vide */}
      {!optimizeMutation.data && !optimizeMutation.isPending && selectedJobIds.length === 0 && (
        <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-12 text-center">
          <Map className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Sélectionnez des métiers pour commencer
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Choisissez un ou plusieurs métiers de récolte, sélectionnez les ressources que vous
            souhaitez collecter, puis lancez l'optimisation pour obtenir une route efficace.
          </p>
        </div>
      )}
    </div>
  );
};
