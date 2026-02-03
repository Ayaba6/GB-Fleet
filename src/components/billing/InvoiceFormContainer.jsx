import React, { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { generateInvoicePDF } from "./InvoiceGenerator.jsx";
import SummaryTableModal from "./SummaryTableModal.jsx";
import ItemsTableModal from "./ItemsTableModal.jsx";
import ClientFormModal from "./ClientFormModal.jsx";
import InvoicePreviewModal from "./InvoicePreviewModal.jsx";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../config/supabaseClient.js";
import { useToast } from "../ui/use-toast.jsx";

export default function InvoiceForm({ isOpen, onClose, refresh, initialData }) {
  const { toast } = useToast();

  // --- États de la Facture ---
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [description, setDescription] = useState("");

  // --- États Client ---
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientRCCM, setClientRCCM] = useState("");
  const [clientIFU, setClientIFU] = useState("");
  const [clientTel, setClientTel] = useState("");

  const [clients, setClients] = useState([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // --- États Période ---
  const [periodeDebut, setPeriodeDebut] = useState("");
  const [periodeFin, setPeriodeFin] = useState("");

  // --- États Tableaux ---
  const [summaryData, setSummaryData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);

  // --- États Aperçu ---
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const inputStyle = "w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";

  // 1. CHARGEMENT ET INITIALISATION (Description incluse)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // MODE ÉDITION : On charge les données existantes
        setInvoiceNumber(initialData.invoice_number || "");
        setDescription(initialData.description || "");
        setClientId(initialData.client_id || null);
        setClientName(initialData.client_name || "");
        setPeriodeDebut(initialData.periode_debut || "");
        setPeriodeFin(initialData.periode_fin || "");
        setSummaryData(initialData.summary_data || []);
        setItemsData(initialData.items_data || []);
      } else {
        // MODE CRÉATION : Valeurs par défaut
        setInvoiceNumber("");
        // ✅ Description par défaut demandée
        setDescription("TRANSPORT DE MINERAI ORE. SOURCE: NIOU / DESTINATION : ROMPAD BISSA");
        setClientId(null);
        setClientName("");
        setPeriodeDebut("");
        setPeriodeFin("");
        setSummaryData([]); 
        setItemsData([]);
      }
    }
  }, [isOpen, initialData]);

  // 2. LOGIQUE CLIENTS
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isOpen) fetchClients();
  }, [isOpen]);

  useEffect(() => {
    if (!clientId) {
      setClientName("");
      setClientAddress("");
      setClientRCCM("");
      setClientIFU("");
      setClientTel("");
      return;
    };
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientName(client.name || "");
      setClientAddress(client.address || "");
      setClientRCCM(client.rccm || "");
      setClientIFU(client.ifu || "");
      setClientTel(client.phone || "");
    }
  }, [clientId, clients]);

  // 3. GÉNÉRATION NUMÉRO
  useEffect(() => {
    if (!isOpen || initialData) return;
    const generateNumber = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const suffix = `-${month}/BAT/${year}`;
        const { data } = await supabase.from("invoices").select("invoice_number").ilike("invoice_number", `%${suffix}`);
        let maxNumber = 0;
        data?.forEach(row => {
          const match = row.invoice_number?.match(/^(\d{1,2})-/);
          if (match) maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
        });
        setInvoiceNumber(`${String(maxNumber + 1).padStart(2, "0")}${suffix}`);
      } catch (err) { console.error(err); }
    };
    generateNumber();
  }, [isOpen, initialData]);

  // 4. SAUVEGARDE
  const handleSave = async () => {
    if (!clientId) {
      toast({ title: "Erreur", description: "Sélectionnez un client", variant: "destructive" });
      return;
    }
    const rowHTVA = summaryData.find(row => row.label === "TOTAL HTVA");
    const amountToSave = rowHTVA ? Number(rowHTVA.amount) : 0;

    const payload = {
      client_id: clientId, client_name: clientName, description,
      amount: amountToSave, due_date: periodeFin || null,
      status: initialData ? initialData.status : "en_attente",
      periode_debut: periodeDebut || null, periode_fin: periodeFin || null,
      invoice_number: invoiceNumber, summary_data: summaryData, items_data: itemsData,
    };

    try {
      const { error } = initialData?.id 
        ? await supabase.from("invoices").update(payload).eq("id", initialData.id)
        : await supabase.from("invoices").insert([{ ...payload, date_created: new Date().toISOString() }]);
      if (error) throw error;
      toast({ title: "Succès", description: "Facture enregistrée." });
      onClose();
      refresh();
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // 5. APERÇU PDF
  useEffect(() => {
    if (!isOpen || !clientName || !invoiceNumber) return;
    try {
      const invoiceData = {
        invoiceNumber, clientName, clientAddress, clientRCCM, clientIFU, clientTel, description,
        periode: periodeDebut && periodeFin ? `${periodeDebut} au ${periodeFin}` : "",
        summaryData: summaryData || [], 
        itemsData: itemsData || [],
      };
      const doc = generateInvoicePDF(invoiceData);
      if (doc) {
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    } catch (error) { console.error("Erreur PDF:", error); }
  }, [isOpen, invoiceNumber, clientName, clientAddress, clientRCCM, clientIFU, clientTel, description, periodeDebut, periodeFin, summaryData, itemsData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm transition-all duration-300 font-sans">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="text-blue-600" /> 
            {initialData ? `Modifier Facture ${invoiceNumber}` : "Nouvelle Facture BATICOM"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto pr-2 flex-1 scrollbar-thin">
          {/* Numéro Facture */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Numéro de facture</label>
            <div className={inputStyle + " font-mono bg-gray-50 dark:bg-gray-800/50 border-dashed"}>{invoiceNumber || "Génération en cours..."}</div>
          </div>

          {/* Client Selection */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Client</label>
              <select className={inputStyle} value={clientId || ""} onChange={(e) => setClientId(Number(e.target.value))}>
                <option value="">-- Sélectionner un client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button onClick={() => setIsClientModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">+ Nouveau</Button>
          </div>

          {/* Client Details (Read Only) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
               <label className="text-[9px] uppercase font-bold text-gray-400">Adresse</label>
               <input type="text" value={clientAddress} readOnly className={inputStyle + " text-xs bg-gray-50 dark:bg-gray-800 text-gray-500"}/>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] uppercase font-bold text-gray-400">RCCM</label>
               <input type="text" value={clientRCCM} readOnly className={inputStyle + " text-xs bg-gray-50 dark:bg-gray-800 text-gray-500"}/>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] uppercase font-bold text-gray-400">IFU</label>
               <input type="text" value={clientIFU} readOnly className={inputStyle + " text-xs bg-gray-50 dark:bg-gray-800 text-gray-500"}/>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] uppercase font-bold text-gray-400">Téléphone</label>
               <input type="text" value={clientTel} readOnly className={inputStyle + " text-xs bg-gray-50 dark:bg-gray-800 text-gray-500"}/>
            </div>
          </div>

          {/* DESCRIPTION : PRÉ-REMPLIE */}
          <div>
            <label className="block text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wider">Objet de la facture (Description)</label>
            <textarea 
              rows="2"
              placeholder="Saisissez la description..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className={inputStyle + " border-blue-200 dark:border-blue-900/50"}
            />
          </div>

          {/* Période Selection */}
          <div className="flex gap-4 items-center bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
            <div className="flex-1">
               <label className="block text-[10px] font-bold text-blue-600 uppercase">Période du</label>
               <input type="date" className={inputStyle} value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)}/>
            </div>
            <span className="mt-4 font-bold text-blue-300">au</span>
            <div className="flex-1">
               <label className="block text-[10px] font-bold text-blue-600 uppercase">Période au</label>
               <input type="date" className={inputStyle} value={periodeFin} onChange={e => setPeriodeFin(e.target.value)}/>
            </div>
          </div>

          {/* Tables Actions */}
          <div className="flex flex-wrap gap-3 pt-3">
            <Button onClick={() => setIsItemsModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white flex-1 py-7 flex flex-col gap-1 shadow-md">
              <span className="text-sm font-bold">📝 Détails Contractuels</span>
              <span className="text-[10px] opacity-80">{itemsData.length > 0 ? "✅ Données saisies" : "Cliquer pour remplir"}</span>
            </Button>
            <Button onClick={() => setIsSummaryModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white flex-1 py-7 flex flex-col gap-1 shadow-md">
              <span className="text-sm font-bold">📊 Détails de Paiements</span>
              <span className="text-[10px] opacity-80">{summaryData.length > 0 ? "✅ Calculs effectués" : "Cliquer pour calculer"}</span>
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-between items-center border-t pt-4">
          <Button onClick={() => setIsPreviewOpen(true)} disabled={!pdfBlobUrl} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
            Aperçu PDF
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-10 py-6 text-lg font-bold shadow-lg transition-transform active:scale-95">
            {initialData ? "Mettre à jour la Facture" : "Enregistrer la Facture"}
          </Button>
        </div>

        {/* Modals enfant */}
        <SummaryTableModal 
          isOpen={isSummaryModalOpen} 
          onClose={() => setIsSummaryModalOpen(false)} 
          onUpdate={setSummaryData} 
          initialData={summaryData}
          itemsData={itemsData} 
        />
        <ItemsTableModal 
          isOpen={isItemsModalOpen} 
          onClose={() => setIsItemsModalOpen(false)} 
          onUpdate={setItemsData} 
          initialData={itemsData} 
        />
        <ClientFormModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onClientAdded={fetchClients}/>
        <InvoicePreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} pdfUrl={pdfBlobUrl}/>
      </div>
    </div>
  );
}