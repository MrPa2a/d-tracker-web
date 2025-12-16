import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchItems } from '../api';

interface Item {
  id: number;
  item_name: string;
  icon_url?: string;
  ankama_id?: number;
}

interface ItemSearchInputProps {
  value: Item | null;
  onChange: (item: Item | null) => void;
  placeholder?: string;
  excludeIds?: number[];
}

export const ItemSearchInput: React.FC<ItemSearchInputProps> = ({ value, onChange, placeholder = "Rechercher un item...", excludeIds = [] }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      return searchItems(debouncedSearch) as Promise<Item[]>;
    },
    enabled: debouncedSearch.length >= 2
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: Item) => {
    onChange(item);
    setSearch('');
    setIsOpen(false);
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 bg-[#25262b] border border-blue-500/30 rounded-lg p-2">
        {value.icon_url && (
          <img 
            src={value.icon_url} 
            alt="" 
            className="w-8 h-8 object-contain bg-black/20 rounded-md" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <span className="text-white text-sm flex-1">{value.item_name}</span>
        <button onClick={() => onChange(null)} className="text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[#25262b] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
        )}
      </div>

      {isOpen && items.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#25262b] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {items
            .filter(item => !excludeIds.includes(item.id))
            .map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3 transition-colors"
            >
              {item.icon_url && (
                <img 
                  src={item.icon_url} 
                  alt="" 
                  className="w-8 h-8 object-contain bg-black/20 rounded-md" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <div className="text-sm text-white">{item.item_name}</div>
                <div className="text-xs text-gray-500">ID: {item.ankama_id}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
