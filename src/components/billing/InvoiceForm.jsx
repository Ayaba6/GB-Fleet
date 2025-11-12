// src/components/billing/InvoiceForm.js
import React, { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { generateInvoicePDF } from "./InvoiceGenerator.jsx";
import SummaryTableModal from "./SummaryTableModal.jsx";
import ItemsTableModal from "./ItemsTableModal.jsx";
import { Button } from "../ui/button.jsx";

export default function InvoiceForm({ isOpen, onClose }) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientRCCM, setClientRCCM] = useState("");
  const [clientIFU, setClientIFU] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [objet, setObjet] = useState("");
  const [periode, setPeriode] = useState("");

  const [summaryData, setSummaryData] = useState([]);
  const [itemsData, setItemsData] = useState([]);

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);

  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // Génération PDF automatique à chaque modification
  useEffect(() => {
    if (!isOpen) return;
    if (invoiceNumber || clientName || summaryData.length || itemsData.length) {
      const invoiceData = {
        invoiceNumber,
        clientName,
        clientAddress,
        clientRCCM,
        clientIFU,
        clientTel,
        objet,
        periode,
        summaryData,
        itemsData,
      };
      const doc = generateInvoicePDF(invoiceData);
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(url);
    }
  }, [
    isOpen,
    invoiceNumber,
    clientName,
    clientAddress,
    clientRCCM,
    clientIFU,
    clientTel,
    objet,
    periode,
    summaryData,
    itemsData,
  ]);

  if (!isOpen) return null;

  const handleGeneratePDF = () => {
    const invoiceData = {
      invoiceNumber,
      clientName,
      clientAddress,
      clientRCCM,
      clientIFU,
      clientTel,
      objet,
      periode,
      summaryData,
      itemsData,
    };
    const doc = generateInvoicePDF(invoiceData);
    doc.save(`${invoiceNumber || "facture"}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="text-blue-600" /> Nouvelle Facture
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Formulaire principal */}
        <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Numéro de facture", value: invoiceNumber, set: setInvoiceNumber, placeholder: "Ex: N001-08/BAT/2025" },
              { label: "Nom du client", value: clientName, set: setClientName, placeholder: "Ex: ETS NAABISSIS" },
              { label: "Adresse complète", value: clientAddress, set: setClientAddress, placeholder: "Ex: 07 BP 5710 OUAGADOUGOU 07" },
              { label: "RCCM", value: clientRCCM, set: setClientRCCM, placeholder: "Ex: BF OUA 01 2023 AIO 04307" },
              { label: "IFU", value: clientIFU, set: setClientIFU, placeholder: "Ex: 00200091L" },
              { label: "Téléphone", value: clientTel, set: setClientTel, placeholder: "Ex: 76 11 04 21 / 70 54 09 55" },
            ].map((input, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{input.label}</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-600 outline-none transition"
                  value={input.value}
                  onChange={(e) => input.set(e.target.value)}
                  placeholder={input.placeholder}
                />
              </div>
            ))}
          </div>

          {/* Objet */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Objet</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-600 outline-none transition"
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex: Transport de Minerai Ore"
            />
          </div>

          {/* Période */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Période</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-600 outline-none transition"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              placeholder="Ex: 26/07/2025 au 25/08/2025"
            />
          </div>

          {/* Boutons modaux */}
          <div className="flex flex-wrap gap-3 pt-3">
            <Button
              onClick={() => setIsSummaryModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition"
            >
              Remplir Tableau Résumé
            </Button>
            <Button
              onClick={() => setIsItemsModalOpen(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition"
            >
              Remplir Tableau Détails
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button
            onClick={handleGeneratePDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow transition"
          >
            Générer le PDF
          </Button>
          {pdfBlobUrl && (
            <a
              href={pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow transition"
            >
              Aperçu PDF
            </a>
          )}
        </div>

        {/* Modals enfants */}
        <SummaryTableModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          onUpdate={setSummaryData}
        />
        <ItemsTableModal
          isOpen={isItemsModalOpen}
          onClose={() => setIsItemsModalOpen(false)}
          onUpdate={setItemsData}
        />
      </div>
    </div>
  );
}
