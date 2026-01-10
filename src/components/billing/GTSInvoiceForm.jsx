// src/components/billing/GTSInvoiceForm.jsx
import React, { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { generateInvoicePDFGTS } from "./InvoiceGeneratorGTS.jsx";
import SummaryTableModal from "./GTSSummaryTableModal.jsx";
import ClientFormModal from "./GTSClientFormModal.jsx";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../config/supabaseClient.js";
import { useToast } from "../ui/use-toast.jsx";

export default function GTSInvoiceForm({ isOpen, onClose, refresh }) {
  const { toast } = useToast();

  // --- Facture ---
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [description, setDescription] = useState("");

  // --- Client ---
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientRCCM, setClientRCCM] = useState("");
  const [clientIFU, setClientIFU] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [clientRegimeFiscal, setClientRegimeFiscal] = useState("");
  const [clientDivisionFiscale, setClientDivisionFiscale] = useState("");
  const [clientZone, setClientZone] = useState("");

  const [clients, setClients] = useState([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // --- Tableau résumé ---
  const [summaryData, setSummaryData] = useState([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // --- Génération automatique du numéro de facture ---
  useEffect(() => {
    if (!isOpen) return;

    const generateInvoiceNumber = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices_gts")
          .select("id")
          .order("id", { ascending: false })
          .limit(1);

        if (error) throw error;
        const lastId = data?.[0]?.id || 0;
        const year = new Date().getFullYear();
        setInvoiceNumber(`N°${String(lastId + 1).padStart(2, "0")}/GTS/${year}`);
      } catch (err) {
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      }
    };

    generateInvoiceNumber();
  }, [isOpen]);

  // --- Charger clients GTS ---
  useEffect(() => {
    if (!isOpen) return;

    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from("clients_gts")
          .select("*")
          .order("name");

        if (error) throw error;
        setClients(data || []);
      } catch (err) {
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      }
    };

    fetchClients();
  }, [isOpen]);

  // --- Pré-remplir les champs client ---
  useEffect(() => {
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientName(client.name || "");
      setClientAddress(client.address || "");
      setClientRCCM(client.rccm || "");
      setClientIFU(client.ifu || "");
      setClientTel(client.phone || "");
      setClientRegimeFiscal(client.regime_fiscal || "");
      setClientDivisionFiscale(client.division_fiscale || "");
      setClientZone(client.zone || "");
    }
  }, [clientId, clients]);

  if (!isOpen) return null;

  // --- Génération PDF au clic seulement ---
  const handleGeneratePDF = () => {
    const invoiceData = {
      invoiceNumber,
      clientName,
      clientAddress,
      clientRCCM,
      clientIFU,
      clientTel,
      clientRegimeFiscal,
      clientDivisionFiscale,
      clientZone,
      description,
      summaryData,
    };
    const doc = generateInvoicePDFGTS(invoiceData);
    doc.save(`${invoiceNumber || "facture-GTS"}.pdf`);

    const pdfBlob = doc.output("blob");
    setPdfBlobUrl(URL.createObjectURL(pdfBlob));
  };

  // =========================
  // ✅ CORRECTION ICI
  // =========================
  const handleSave = async () => {
    if (!clientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("invoices_gts").insert([
        {
          client_id: clientId,
          client_name: clientName,
          description,

          amount: summaryData.reduce(
            (acc, s) => acc + Number(s.amount || 0),
            0
          ),

          date_created: new Date().toISOString(),
          status: "en_attente",
          division_fiscale: clientDivisionFiscale,
          regime_fiscal: clientRegimeFiscal,
          zone: clientZone,
          invoice_number: invoiceNumber,

          // ✅ AJOUT CRITIQUE
          summary_data: summaryData,
          items_data: summaryData,
        }
      ]);

      if (error) throw error;

      toast({
        title: "Facture enregistrée",
        description: "La facture GTS a été sauvegardée avec succès.",
      });

      onClose();
      refresh();
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleClientAdded = (client) => {
    setClients(prev => [...prev, client]);
    setClientId(client.id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4 border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="text-blue-600" /> Nouvelle Facture GTS
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X size={22} />
          </button>
        </div>

        {/* Formulaire */}
        <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-2">
          <input
            type="text"
            placeholder="Numéro facture"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          />

          {/* Sélect client */}
          <div className="flex gap-2">
            <select
              value={clientId || ""}
              onChange={(e) => setClientId(Number(e.target.value))}
              className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="">-- Sélectionner un client GTS --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button onClick={() => setIsClientModalOpen(true)}>+ Nouveau</Button>
          </div>

          {/* Champs client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Adresse" value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="RCCM" value={clientRCCM} onChange={e => setClientRCCM(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="IFU" value={clientIFU} onChange={e => setClientIFU(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="Téléphone" value={clientTel} onChange={e => setClientTel(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="Régime Fiscal" value={clientRegimeFiscal} onChange={e => setClientRegimeFiscal(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="Division Fiscale" value={clientDivisionFiscale} onChange={e => setClientDivisionFiscale(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="Zone" value={clientZone} onChange={e => setClientZone(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
          </div>

          {/* Description */}
          <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>

          {/* Bouton résumé */}
          <div className="flex flex-wrap gap-3 pt-3">
            <Button onClick={() => setIsSummaryModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition">
              Remplir Tableau Résumé
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button onClick={handleGeneratePDF} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow transition">
            Générer le PDF
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md shadow transition">
            Enregistrer
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

        <SummaryTableModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          onUpdate={setSummaryData}
        />
        <ClientFormModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onClientAdded={handleClientAdded}
        />
      </div>
    </div>
  );
}
