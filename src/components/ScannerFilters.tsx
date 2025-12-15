import React from 'react';
import { Search, Clock, Activity, Loader2 } from 'lucide-react';
import kamaIcon from '../assets/kama.png';
import type { Category } from '../types';

export interface ScannerFiltersProps {
  minProfit: string;
  setMinProfit: (val: string) => void;
  minMargin: string;
  setMinMargin: (val: string) => void;
  freshness: string;
  setFreshness: (val: string) => void;
  maxVolatility: string;
  setMaxVolatility: (val: string) => void;
  categories: Category[];
  selectedCategories: string[];
  toggleCategory: (cat: string) => void;
  handleSearch: () => void;
  loading: boolean;
  handleNumberChange: (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ScannerFilters: React.FC<ScannerFiltersProps> = ({
  minProfit, setMinProfit,
  minMargin, setMinMargin,
  freshness, setFreshness,
  maxVolatility, setMaxVolatility,
  categories, selectedCategories, toggleCategory,
  handleSearch, loading, handleNumberChange
}) => (
  <div className="space-y-4">
    {/* Profit Min */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Profit Minimum</label>
      <div className="relative">
        <input 
          type="text" 
          value={minProfit}
          onChange={handleNumberChange(setMinProfit)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 5 000"
        />
        <img src={kamaIcon} className="w-4 h-4 absolute left-2.5 top-3 opacity-50" />
      </div>
    </div>

    {/* Marge Min */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Marge Minimum (%)</label>
      <div className="relative">
        <input 
          type="number" 
          value={minMargin}
          onChange={(e) => setMinMargin(e.target.value)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 15"
        />
        <span className="absolute left-3 top-2.5 text-gray-500">%</span>
      </div>
    </div>

    {/* Freshness */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Ancienneté Max (Heures)</label>
      <div className="relative">
        <input 
          type="number" 
          value={freshness}
          onChange={(e) => setFreshness(e.target.value)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 24"
        />
        <Clock className="w-4 h-4 absolute left-2.5 top-3 text-gray-500" />
      </div>
      <p className="text-xs text-gray-500 mt-1">Exclure les prix relevés il y a plus de X heures</p>
    </div>

    {/* Stability */}
    <div>
      <label className="block text-sm text-gray-400 mb-1">Volatilité Max (%)</label>
      <div className="relative">
        <input 
          type="number" 
          value={maxVolatility}
          onChange={(e) => setMaxVolatility(e.target.value)}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent-primary focus:outline-none pl-8"
          placeholder="Ex: 10"
        />
        <Activity className="w-4 h-4 absolute left-2.5 top-3 text-gray-500" />
      </div>
      <p className="text-xs text-gray-500 mt-1">Plus bas = Plus stable (Moins risqué)</p>
    </div>

    {/* Categories */}
    <div>
      <label className="block text-sm text-gray-400 mb-2">Catégories</label>
      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.name)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              selectedCategories.includes(cat.name)
                ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                : 'bg-[#25262b] border-white/10 text-gray-400 hover:border-white/30'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>

    <button 
      onClick={handleSearch}
      disabled={loading}
      className="w-full bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
      Scanner le marché
    </button>
  </div>
);
