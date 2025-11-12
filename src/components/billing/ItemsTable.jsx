import React from "react";

export default function ItemsTable({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-4 border rounded p-2 max-h-40 overflow-y-auto">
      <h3 className="font-bold mb-2">Articles</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1">Description</th>
            <th className="border px-2 py-1 text-right">Qté</th>
            <th className="border px-2 py-1 text-right">Prix Unitaire</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td className="border px-2 py-1">{row.description}</td>
              <td className="border px-2 py-1 text-right">{row.quantity}</td>
              <td className="border px-2 py-1 text-right">
                {row.unitPrice.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
