import React, { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { generateInvoicePDFGTS } from "./InvoiceGeneratorGTS.jsx";
import SummaryTableModal from "./GTSSummaryTableModal.jsx";
import ClientFormModal from "./GTSClientFormModal.jsx";
import InvoicePreviewModal from "./InvoicePreviewModal.jsx";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../config/supabaseClient.js";
import { useToast } from "../ui/use-toast.jsx";

// Constantes pour les descriptions de transport
const PRESTATIONS_GTS = [
  "Transport de clinker (Lome-Ouagadougou)",
  "Transport de gypse (Lome-Ouagadougou)",
];

export default function GTSInvoiceForm({ isOpen, onClose, refresh, initialData = null }) {
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

  // --- Aperçu PDF ---
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Style de forçage pour la visibilité du texte
  const textInputStyle = "w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  // ==========================================
  // 1. INITIALISATION (AJOUT OU MODIFICATION)
  // ==========================================
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Mode Modification
        setInvoiceNumber(initialData.invoice_number || "");
        setDescription(initialData.description || "");
        setClientId(initialData.client_id || null);
        setSummaryData(initialData.summary_data || []);
      } else {
        // Mode Nouveau
        setInvoiceNumber("");
        setDescription("");
        setClientId(null);
        setSummaryData([]);
        generateInvoiceNumber();
      }
    }
  }, [isOpen, initialData]);

  // --- Génération automatique du numéro ---
  const generateInvoiceNumber = async () => {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const suffix = `-${month}/GTS/${year}`;

      const { data, error } = await supabase
        .from("invoices_gts")
        .select("invoice_number")
        .ilike("invoice_number", `%${suffix}`);

      if (error) throw error;

      let maxNumber = 0;
      data?.forEach(row => {
        const match = row.invoice_number?.match(/^(\d{1,2})-/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });

      const nextNumber = maxNumber + 1;
      const padded = String(nextNumber).padStart(2, "0");
      setInvoiceNumber(`${padded}-${month}/GTS/${year}`);
    } catch (err) {
      console.error("Erreur génération numéro:", err);
    }
  };

  // --- Charger clients GTS ---
  useEffect(() => {
    if (!isOpen) return;
    const fetchClients = async () => {
      const { data } = await supabase.from("clients_gts").select("*").order("name");
      if (data) setClients(data);
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

  // --- Gestion de l'aperçu PDF ---
  useEffect(() => {
    if (!isOpen || !invoiceNumber || !clientName) return;

    const invoiceData = {
      invoiceNumber, clientName, clientAddress, clientRCCM, clientIFU,
      clientTel, clientRegimeFiscal, clientDivisionFiscale, clientZone,
      description, summaryData,
    };

    const doc = generateInvoicePDFGTS(invoiceData);
    const url = URL.createObjectURL(doc.output("blob"));
    setPdfBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [isOpen, invoiceNumber, clientName, clientAddress, description, summaryData]);

  // --- Sauvegarde (INSERT OU UPDATE) ---
  const handleSave = async () => {
    if (!clientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }

    const payload = {
      client_id: clientId,
      client_name: clientName,
      description,
      amount: summaryData.reduce((acc, s) => acc + Number(s.montantNet || 0), 0),
      division_fiscale: clientDivisionFiscale,
      regime_fiscal: clientRegimeFiscal,
      zone: clientZone,
      invoice_number: invoiceNumber,
      summary_data: summaryData,
      items_data: summaryData,
    };

    try {
      let error;
      if (initialData?.id) {
        // MODE UPDATE
        const { error: err } = await supabase.from("invoices_gts").update(payload).eq("id", initialData.id);
        error = err;
      } else {
        // MODE INSERT
        const { error: err } = await supabase.from("invoices_gts").insert([{ 
          ...payload, 
          date_created: new Date().toISOString(), 
          status: "en_attente" 
        }]);
        error = err;
      }

      if (error) throw error;
      toast({ title: "Succès", description: "La facture GTS a été sauvegardée." });
      onClose();
      refresh();
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleGeneratePDF = () => {
    const doc = generateInvoicePDFGTS({
      invoiceNumber, clientName, clientAddress, clientRCCM, clientIFU,
      clientTel, clientRegimeFiscal, clientDivisionFiscale, clientZone,
      description, summaryData,
    });
    doc.save(`${invoiceNumber}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4 border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="text-blue-600" /> {initialData ? `Modifier Facture ${invoiceNumber}` : "Nouvelle Facture GTS"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><X size={22} /></button>
        </div>

        {/* Formulaire */}
        <div className="space-y-5 overflow-y-auto pr-2 flex-1">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Référence Facture</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={textInputStyle}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Client GTS</label>
              <select
                value={clientId || ""}
                onChange={(e) => setClientId(Number(e.target.value))}
                className={textInputStyle}
              >
                <option value="">-- Sélectionner un client GTS --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setIsClientModalOpen(true)}>+ Nouveau</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Adresse" value={clientAddress} readOnly className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800/50 text-gray-500" />
            <input type="text" placeholder="RCCM" value={clientRCCM} readOnly className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800/50 text-gray-500" />
            <input type="text" placeholder="IFU" value={clientIFU} readOnly className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800/50 text-gray-500" />
            <input type="text" placeholder="Téléphone" value={clientTel} readOnly className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800/50 text-gray-500" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Description de la prestation</label>
            <select 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className={textInputStyle}
            >
              <option value="">-- Sélectionner une prestation --</option>
              {PRESTATIONS_GTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">Tableau Résumé d'Exploitation</h3>
                <p className="text-xs text-gray-500">{summaryData.length} ligne(s) enregistrée(s)</p>
              </div>
              <Button onClick={() => setIsSummaryModalOpen(true)} className="bg-green-600 hover:bg-green-700">
                {summaryData.length > 0 ? "Modifier les données" : "Remplir le tableau"}
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button onClick={() => setIsPreviewOpen(true)} disabled={!pdfBlobUrl} variant="outline" className="border-gray-300">
            Aperçu PDF
          </Button>
          <Button onClick={handleGeneratePDF} className="bg-blue-600 text-white">
            Télécharger PDF
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-8 font-bold">
            {initialData ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </div>

        {/* Modals Enfant */}
        <SummaryTableModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          onUpdate={setSummaryData}
          initialData={summaryData}
        />
        <ClientFormModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onClientAdded={(c) => { setClients(prev => [...prev, c]); setClientId(c.id); }}
        />
        <InvoicePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          pdfUrl={pdfBlobUrl}
        />
      </div>
    </div>
  );
}