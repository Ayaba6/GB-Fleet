import React from "react";

export default function SummaryTable({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-4 border rounded p-2 max-h-40 overflow-y-auto">
      <h3 className="font-bold mb-2">Résumé</h3>
      <table className="w-full text-sm">
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td className="border px-2 py-1">{row.label}</td>
              <td className="border px-2 py-1 text-right">
                {row.value.toLocaleString ? row.value.toLocaleString() : row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
