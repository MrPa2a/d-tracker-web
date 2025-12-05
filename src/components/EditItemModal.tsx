import React, { useState, useEffect } from 'react';
import type { ItemSummary, TimeseriesPoint } from '../types';
import { updateItem, updateObservation, createObservation, deleteObservation } from '../api';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemSummary;
  timeseries: TimeseriesPoint[];
  onRefresh: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  onClose,
  item,
  timeseries,
  onRefresh,
}) => {
  const [newItemName, setNewItemName] = useState(item.item_name);
  const [editedTimeseries, setEditedTimeseries] = useState<TimeseriesPoint[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [newDate, setNewDate] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewItemName(item.item_name);
      // Clone timeseries and sort by date descending (newest first)
      const sorted = [...timeseries].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEditedTimeseries(sorted);
      setDeletedIds(new Set());
      setNewDate('');
      setNewPrice('');
      setError(null);
    }
  }, [isOpen, item, timeseries]);

  if (!isOpen) return null;

  const handlePriceChange = (id: number, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;

    setEditedTimeseries((prev) => 
      prev.map((p) => (p.id === id ? { ...p, avg_price: price } : p))
    );
  };

  const handleAddEntry = () => {
    if (!newDate || !newPrice) return;
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;

    const tempId = -Date.now(); // Temporary negative ID
    const newPoint: TimeseriesPoint = {
      id: tempId,
      date: new Date(newDate).toISOString(),
      avg_price: price
    };

    setEditedTimeseries(prev => {
      const next = [newPoint, ...prev];
      return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    setNewDate('');
    setNewPrice('');
  };

  const handleDelete = (id: number) => {
    if (id > 0) {
      setDeletedIds(prev => new Set(prev).add(id));
    }
    setEditedTimeseries(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // 1. Rename item if changed
      if (newItemName !== item.item_name) {
        await updateItem(item.item_name, newItemName, item.server);
      }

      const promises = [];

      // 2. Deletions
      for (const id of deletedIds) {
        promises.push(deleteObservation(id));
      }

      // 3. Updates and Creations
      const originalMap = new Map(timeseries.map(t => [t.id, t]));
      
      for (const edited of editedTimeseries) {
        if (edited.id < 0) {
          // Creation
          promises.push(createObservation(newItemName, item.server, edited.avg_price, edited.date));
        } else {
          // Update
          const original = originalMap.get(edited.id);
          if (original && original.avg_price !== edited.avg_price) {
            promises.push(updateObservation(edited.id, edited.avg_price));
          }
        }
      }
      await Promise.all(promises);

      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border-normal rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-border-normal flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Modifier l'item</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-200 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-text-muted mb-2">
              Nom de l'item
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full bg-bg-primary border border-border-normal rounded px-3 py-2 text-text-primary focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-3">Ajouter une entrée</h3>
            <div className="flex gap-3 items-end bg-bg-primary/30 p-3 rounded border border-border-normal">
              <div className="flex-1">
                <label className="block text-xs text-text-muted mb-1">Date et Heure</label>
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-bg-primary border border-border-normal rounded px-2 py-1 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs text-text-muted mb-1">Prix</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Prix"
                  className="w-full bg-bg-primary border border-border-normal rounded px-2 py-1 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
                />
              </div>
              <button
                onClick={handleAddEntry}
                disabled={!newDate || !newPrice}
                className="px-3 py-1 bg-accent-success/20 text-accent-success border border-accent-success/30 rounded hover:bg-accent-success/30 disabled:opacity-50 disabled:cursor-not-allowed h-[30px] flex items-center"
              >
                + Ajouter
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-3">Historique des prix</h3>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left border-collapse relative">
                <thead>
                  <tr className="border-b border-border-normal">
                    <th className="p-2 text-text-muted font-medium sticky top-0 bg-bg-secondary z-10 shadow-sm">Date</th>
                    <th className="p-2 text-text-muted font-medium sticky top-0 bg-bg-secondary z-10 shadow-sm">Prix Moyen</th>
                    <th className="p-2 text-text-muted font-medium sticky top-0 bg-bg-secondary z-10 shadow-sm w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {editedTimeseries.map((point) => (
                    <tr key={point.id} className="border-b border-border-normal/50 hover:bg-bg-primary/50 group">
                      <td className="p-2 text-text-primary">
                        {new Date(point.date).toLocaleString()}
                        {point.id < 0 && <span className="ml-2 text-xs text-accent-success">(Nouveau)</span>}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={point.avg_price}
                          onChange={(e) => handlePriceChange(point.id, e.target.value)}
                          className="bg-bg-primary border border-border-normal rounded px-2 py-1 text-text-primary w-32 focus:outline-none focus:border-accent-primary"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDelete(point.id)}
                          className="text-text-muted hover:text-accent-danger transition-colors p-2 rounded hover:bg-accent-danger/10"
                          title="Supprimer"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border-normal flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-text-primary hover:bg-bg-primary transition-colors"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-accent-primary text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
};
