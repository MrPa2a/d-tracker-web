import React, { useState } from 'react';
import { X, Plus, Save, Trash2, AlertTriangle } from 'lucide-react';
import { ItemSearchInput } from './ItemSearchInput';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomRecipe } from '../api';

interface Item {
  id: number;
  item_name: string;
  icon_url?: string;
  ankama_id?: number;
}

interface Ingredient {
  item: Item | null;
  quantity: number;
  tempId: number; // For key
}

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddRecipeModal: React.FC<AddRecipeModalProps> = ({ isOpen, onClose }) => {
  const [resultItem, setResultItem] = useState<Item | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => [{ item: null, quantity: 1, tempId: Date.now() }]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const addIngredient = () => {
    setIngredients([...ingredients, { item: null, quantity: 1, tempId: Date.now() }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!resultItem) throw new Error("Veuillez sélectionner l'item à crafter");
      
      const validIngredients = ingredients.filter(i => i.item && i.quantity > 0);
      if (validIngredients.length === 0) throw new Error("Veuillez ajouter au moins un ingrédient");

      const payload = {
        result_item_id: resultItem.id,
        ingredients: validIngredients.map(i => ({
          item_id: i.item!.id,
          quantity: i.quantity
        }))
      };

      await createCustomRecipe(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
      // Reset form
      setResultItem(null);
      setIngredients([{ item: null, quantity: 1, tempId: Date.now() }]);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1a1b1e] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#1a1b1e] flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Ajouter une recette manuelle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 min-h-[300px]">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Result Item */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Item à crafter</label>
            <ItemSearchInput 
              value={resultItem} 
              onChange={setResultItem} 
              placeholder="Rechercher l'item final..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Si une recette existe déjà pour cet item, elle sera remplacée et verrouillée.
            </p>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-400">Ingrédients</label>
              <button 
                onClick={addIngredient}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus size={14} /> Ajouter un ingrédient
              </button>
            </div>
            
            <div className="space-y-3">
              {ingredients.map((ing, index) => (
                <div key={ing.tempId} className="flex items-start gap-3">
                  <div className="flex-1">
                    <ItemSearchInput 
                      value={ing.item} 
                      onChange={(item) => updateIngredient(index, 'item', item)}
                      placeholder="Ingrédient..."
                      excludeIds={resultItem ? [resultItem.id] : []}
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#25262b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button 
                    onClick={() => removeIngredient(index)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-[#1a1b1e] p-6 border-t border-white/5 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !resultItem}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? (
              <>Enregistrement...</>
            ) : (
              <>
                <Save size={16} />
                Enregistrer la recette
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
