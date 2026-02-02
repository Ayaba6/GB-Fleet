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

  const inputStyle = "w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white";

  // 1. CHARGEMENT
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setInvoiceNumber(initialData.invoice_number || "");
        setDescription(initialData.description || "");
        setClientId(initialData.client_id || null);
        setClientName(initialData.client_name || "");
        setPeriodeDebut(initialData.periode_debut || "");
        setPeriodeFin(initialData.periode_fin || "");
        setSummaryData(initialData.summary_data || []);
        setItemsData(initialData.items_data || []);
      } else {
        setInvoiceNumber("");
        setDescription("");
        setClientId(null);
        setClientName("");
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
    if (!clientId) return;
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

  // 5. APERÇU PDF (CORRIGÉ AVEC SÉCURITÉ)
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
    } catch (error) {
      console.error("Erreur génération PDF:", error);
    }
  }, [isOpen, invoiceNumber, clientName, clientAddress, clientRCCM, clientIFU, clientTel, description, periodeDebut, periodeFin, summaryData, itemsData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 transition-all duration-300 font-sans">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
        
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="text-blue-600" /> 
            {initialData ? `Modifier Facture ${invoiceNumber}` : "Nouvelle Facture BATICOM"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><X size={22} /></button>
        </div>

        <div className="space-y-5 overflow-y-auto pr-2 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1 uppercase">Numéro de facture</label>
            <div className={inputStyle + " font-mono bg-gray-50"}>{invoiceNumber || "En attente..."}</div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-500 mb-1 uppercase">Client</label>
              <select className={inputStyle} value={clientId || ""} onChange={(e) => setClientId(Number(e.target.value))}>
                <option value="">-- Sélectionner un client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button onClick={() => setIsClientModalOpen(true)}>+ Nouveau</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Adresse" value={clientAddress} readOnly className={inputStyle + " bg-gray-50 text-gray-500"}/>
            <input type="text" placeholder="RCCM" value={clientRCCM} readOnly className={inputStyle + " bg-gray-50 text-gray-500"}/>
            <input type="text" placeholder="IFU" value={clientIFU} readOnly className={inputStyle + " bg-gray-50 text-gray-500"}/>
            <input type="text" placeholder="Téléphone" value={clientTel} readOnly className={inputStyle + " bg-gray-50 text-gray-500"}/>
          </div>

          <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className={inputStyle}/>

          <div className="flex gap-4 items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
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

          <div className="flex flex-wrap gap-3 pt-3">
            <Button onClick={() => setIsItemsModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white flex-1 py-6">
              {itemsData.length > 0 ? "✅ Détails Contractuels (Éditer)" : "📝 Remplir Détails Contractuels"}
            </Button>
            <Button onClick={() => setIsSummaryModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white flex-1 py-6">
              {summaryData.length > 0 ? "✅ Details de paiements (Éditer)" : "📊 Remplir Details de Paiements"}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center border-t pt-4">
          <Button onClick={() => setIsPreviewOpen(true)} disabled={!pdfBlobUrl} variant="outline" className="border-blue-600 text-blue-600">
            Aperçu PDF
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-10 py-5 text-lg font-bold">
            {initialData ? "Mettre à jour" : "Enregistrer la Facture"}
          </Button>
        </div>

        {/* MODALS : Notez l'ordre et le passage des itemsData vers Summary */}
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