"use client";

import { useState } from "react";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

interface KeyValueBuilderProps {
  onChange: (pairs: KeyValuePair[]) => void;
  initialPairs?: KeyValuePair[];
}

export function KeyValueBuilder({
  onChange,
  initialPairs = [],
}: KeyValueBuilderProps) {
  const [pairs, setPairs] = useState<KeyValuePair[]>(initialPairs);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const addRow = () => {
    const newPair: KeyValuePair = {
      id: Date.now().toString(),
      key: "",
      value: "",
    };
    const updated = [...pairs, newPair];
    setPairs(updated);
    onChange(updated);
  };

  const removeRow = (id: string) => {
    const updated = pairs.filter((p) => p.id !== id);
    setPairs(updated);
    onChange(updated);
  };

  const updatePair = (id: string, key: string, value: string) => {
    const updated = pairs.map((p) =>
      p.id === id ? { ...p, key, value } : p
    );
    setPairs(updated);
    onChange(updated);
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = pairs.findIndex((p) => p.id === draggedId);
    const targetIndex = pairs.findIndex((p) => p.id === targetId);

    const updated = [...pairs];
    [updated[draggedIndex], updated[targetIndex]] = [
      updated[targetIndex],
      updated[draggedIndex],
    ];

    setPairs(updated);
    onChange(updated);
    setDraggedId(null);
  };

  const isKeyUnique = (key: string, excludeId: string) => {
    return !pairs.some((p) => p.id !== excludeId && p.key === key);
  };

  return (
    <div className="space-y-3">
      {pairs.map((pair) => (
        <div
          key={pair.id}
          draggable
          onDragStart={() => handleDragStart(pair.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(pair.id)}
          className="flex gap-2 items-center p-3 bg-gray-50 rounded border border-gray-200 cursor-move hover:bg-gray-100 transition-colors"
        >
          <span className="text-gray-400 text-lg">⋮⋮</span>
          <input
            type="text"
            placeholder="Key"
            value={pair.key}
            onChange={(e) => updatePair(pair.id, e.target.value, pair.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Value"
            value={pair.value}
            onChange={(e) => updatePair(pair.id, pair.key, e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => removeRow(pair.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label="Remove row"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
      >
        + Add Row
      </button>
    </div>
  );
}
