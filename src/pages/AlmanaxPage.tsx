import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, TrendingUp, ShoppingCart, Info, Loader2 } from 'lucide-react';
import { useAlmanax } from '../hooks/useToolbox';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import kamaIcon from '../assets/kama.png';

interface AlmanaxPageProps {
  server: string | null;
}

export const AlmanaxPage: React.FC<AlmanaxPageProps> = ({ server }) => {
  const { data: almanaxData, isLoading, error } = useAlmanax(server || undefined);

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  const todayOffering = useMemo(() => 
    almanaxData?.find(d => isSameDay(parseISO(d.date), today)), 
  [almanaxData, today]);

  const tomorrowOffering = useMemo(() => 
    almanaxData?.find(d => isSameDay(parseISO(d.date), tomorrow)), 
  [almanaxData, tomorrow]);

  const futureOfferings = useMemo(() => 
    almanaxData?.filter(d => parseISO(d.date) > tomorrow) || [], 
  [almanaxData, tomorrow]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>Erreur lors du chargement de l'Almanax.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 md:pb-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Calendar className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
          Almanax & Spéculation
        </h1>
        <p className="text-sm md:text-base text-gray-400 max-w-2xl">
          Anticipez les offrandes quotidiennes pour maximiser vos profits. Achetez les ressources à l'avance quand elles sont peu chères, et revendez-les le jour J au prix fort.
        </p>
      </div>

      {/* Today's Highlight */}
      {todayOffering && (
        <div className="bg-[#1a1b1e] border border-emerald-500/20 rounded-xl p-6 relative overflow-hidden group">
          <Link 
            to={`/item/${server}/${encodeURIComponent(todayOffering.item.name)}`}
            className="relative z-10 flex flex-col md:flex-row gap-8 items-center hover:opacity-90 transition-opacity"
          >
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center relative">
                <img 
                  src={todayOffering.item.icon_url} 
                  alt={todayOffering.item.name} 
                  className="w-16 h-16 object-contain"
                />
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">
                  x{todayOffering.quantity}
                </div>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-sm">Aujourd'hui</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300">{format(parseISO(todayOffering.date), 'EEEE d MMMM', { locale: fr })}</span>
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors mb-2">{todayOffering.item.name}</h2>
              <p className="text-gray-400 mb-4">{todayOffering.bonus_description}</p>
              <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                <span className="text-gray-400 text-sm">Prix actuel :</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  {todayOffering.item.last_price ? todayOffering.item.last_price.toLocaleString() : 'N/A'} 
                  <img src={kamaIcon} alt="k" className="w-3 h-3" />
                </span>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Calendar className="w-32 h-32 text-emerald-500" />
            </div>
          </Link>
        </div>
      )}

      {/* Carousel */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Prochaines Offrandes
        </h3>
        <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {futureOfferings.map((day) => (
            <Link 
              key={day.date} 
              to={`/item/${server}/${encodeURIComponent(day.item.name)}`}
              className="flex-shrink-0 w-48 bg-[#1a1b1e] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors group block"
            >
              <div className="text-center mb-3">
                <div className="text-sm text-gray-400 capitalize mb-1">
                  {format(parseISO(day.date), 'EEE d MMM', { locale: fr })}
                </div>
                <div className="text-xs text-gray-500">
                  Dans {Math.ceil((parseISO(day.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} jours
                </div>
              </div>
              
              <div className="flex justify-center mb-3 relative">
                <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img src={day.item.icon_url} alt={day.item.name} className="w-10 h-10 object-contain" />
                </div>
                <div className="absolute -top-1 -right-1 bg-gray-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  x{day.quantity}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate mb-1" title={day.item.name}>
                  {day.item.name}
                </div>
                <div className="text-xs text-amber-400 font-mono flex items-center justify-center gap-1">
                  {day.item.last_price ? day.item.last_price.toLocaleString() : '-'}
                  <img src={kamaIcon} alt="k" className="w-2 h-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Investment Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sell Opportunities */}
        <div className="bg-[#1a1b1e] border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-red-400" />
            Opportunités de Vente (Court Terme)
          </h3>
          <div className="space-y-4">
            {[todayOffering, tomorrowOffering].filter(Boolean).map((day, idx) => (
              day && (
                <Link 
                  key={day.date} 
                  to={`/item/${server}/${encodeURIComponent(day.item.name)}`}
                  className="flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/5 hover:bg-white/10 transition-colors block group"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img src={day.item.icon_url} alt={day.item.name} className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{day.item.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {idx === 0 ? "Aujourd'hui" : "Demain"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      Quantité requise : {day.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold flex items-center justify-end gap-1">
                      {day.item.last_price ? day.item.last_price.toLocaleString() : '?'} 
                      <img src={kamaIcon} alt="k" className="w-3 h-3" />
                    </div>
                    <div className="text-xs text-gray-500">Prix unitaire</div>
                  </div>
                </Link>
              )
            ))}
            {!todayOffering && !tomorrowOffering && (
              <p className="text-gray-500 text-center py-4">Aucune donnée pour aujourd'hui ou demain.</p>
            )}
          </div>
        </div>

        {/* Buy Opportunities */}
        <div className="bg-[#1a1b1e] border border-white/10 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            Opportunités d'Achat (Moyen Terme)
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Préparez ces offrandes maintenant pendant que les prix sont stables.
          </p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
            {futureOfferings.slice(0, 10).map((day) => (
              <Link 
                key={day.date} 
                to={`/item/${server}/${encodeURIComponent(day.item.name)}`}
                className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-emerald-500/30 transition-colors block group"
              >
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img src={day.item.icon_url} alt={day.item.name} className="w-6 h-6 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors truncate">{day.item.name}</h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {format(parseISO(day.date), 'd MMM', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">Qté: {day.quantity}</span>
                    <span className="text-sm text-emerald-400 font-mono flex items-center gap-1">
                      {day.item.last_price ? day.item.last_price.toLocaleString() : '-'}
                      <img src={kamaIcon} alt="k" className="w-2 h-2" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
