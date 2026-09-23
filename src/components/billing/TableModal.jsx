import React, { useState } from "react";
import { X, Plus, Check } from "lucide-react";

export default function TableModal({ isOpen, onClose, columns, data, setData, title }) {
  const [newRow, setNewRow] = useState(columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {}));

  if (!isOpen) return null;

  const handleAddRow = () => {
    setData([...data, newRow]);
    setNewRow(columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {}));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl w-full max-w-2xl relative shadow-2xl overflow-auto max-h-[80vh]">
        {/* Bouton fermer */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold mb-4">{title}</h2>

        {/* Table existante */}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} className="border px-2 py-1 bg-gray-100">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map(col => (
                  <td key={col} className="border px-2 py-1">{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Formulaire nouvelle ligne */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {columns.map(col => (
            <input
              key={col}
              type="text"
              placeholder={col}
              value={newRow[col]}
              onChange={e => setNewRow({ ...newRow, [col]: e.target.value })}
              className="border px-2 py-1 rounded"
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            <Plus size={16} /> Ajouter
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            <Check size={16} /> Valider
          </button>
        </div>
      </div>
    </div>
  );
}
