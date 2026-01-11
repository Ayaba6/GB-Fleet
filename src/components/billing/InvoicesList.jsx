// src/components/billing/InvoicesList.jsx
import React, { useState } from "react";
import { PencilSquareIcon, TrashIcon, PrinterIcon, EyeIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../config/supabaseClient.js";
import { useToast } from "../ui/use-toast.jsx";
import { generateInvoicePDF } from "./InvoiceGenerator.jsx";
import { X } from "lucide-react";

// --- Modal interne pour aperçu et impression ---
function InvoicePreviewModal({ isOpen, onClose, pdfUrl }) {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Aperçu Facture BATICOM</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X size={22} />
          </button>
        </div>
        <iframe
          src={pdfUrl}
          className="flex-1 w-full border-none"
          title="Aperçu Facture"
        />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={() => { if (pdfUrl) window.open(pdfUrl, "_blank"); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Imprimer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesList({ invoices, onEdit, onDelete, emptyMessage, type = "baticom" }) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ===============================
  // Générer / Aperçu PDF
  // ===============================
  const buildPDF = async (invoice, preview = false) => {
    try {
      const tableName = type === "gts" ? "invoices_gts" : "invoices";
      const clientTable = type === "gts" ? "clients_gts" : "clients";

      const { data: fullInvoice, error: invoiceError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", invoice.id)
        .single();
      if (invoiceError) throw invoiceError;

      const { data: clientData, error: clientError } = await supabase
        .from(clientTable)
        .select("*")
        .eq("id", fullInvoice.client_id)
        .single();
      if (clientError) throw clientError;

      const invoiceData = {
        invoiceNumber: fullInvoice.invoice_number,
        clientName: clientData.name,
        clientAddress: clientData.address,
        clientRCCM: clientData.rccm,
        clientIFU: clientData.ifu,
        clientTel: clientData.phone,
        description: fullInvoice.description,
        summaryData: fullInvoice.summary_data || [],
        itemsData: fullInvoice.items_data || [],
        periode:
          fullInvoice.periode_debut && fullInvoice.periode_fin
            ? `${new Date(fullInvoice.periode_debut).toLocaleDateString("fr-FR")} - ${new Date(fullInvoice.periode_fin).toLocaleDateString("fr-FR")}`
            : "",
        date_created: fullInvoice.date_created,
      };

      const doc = generateInvoicePDF(invoiceData);

      if (preview) {
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsPreviewOpen(true);
      } else {
        doc.save(`${invoiceData.invoiceNumber || "facture"}.pdf`);
      }
    } catch (err) {
      console.error("Erreur facture:", err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // ===============================
  // Aucune facture
  // ===============================
  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
        <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">
          {emptyMessage || "Aucune facture trouvée."}
        </p>
      </div>
    );
  }

  // ===============================
  // Tableau
  // ===============================
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">N° Facture</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Client</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Montant</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Date</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center text-gray-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {invoices.map((inv) => (
                <tr key={inv.id} className="group hover:bg-blue-50/30 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{inv.invoice_number || `#${inv.id}`}</span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{inv.client_name || "—"}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{Number(inv.amount || 0).toLocaleString("fr-FR")}<span className="text-[10px] text-gray-500"> XOF</span></div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-slate-400">{inv.date_created ? new Date(inv.date_created).toLocaleDateString("fr-FR") : "-"}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-3">
                      {onEdit && <button onClick={() => onEdit(inv)} className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg" title="Modifier"><PencilSquareIcon className="w-5 h-5" /></button>}
                      {onDelete && <button onClick={() => window.confirm("Supprimer ?") && onDelete(inv.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Supprimer"><TrashIcon className="w-5 h-5" /></button>}
                      <button onClick={() => buildPDF(inv, true)} className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg" title="Aperçu"><EyeIcon className="w-5 h-5" /></button>
                      <button onClick={() => buildPDF(inv, false)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Imprimer"><PrinterIcon className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Aperçu PDF */}
      <InvoicePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfUrl={previewUrl}
      />
    </>
  );
}
