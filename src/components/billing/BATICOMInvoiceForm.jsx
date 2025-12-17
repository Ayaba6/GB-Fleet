// src/components/billing/InvoiceForm.jsx
import React, { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { generateInvoicePDF } from "./InvoiceGenerator.jsx";
import SummaryTableModal from "./SummaryTableModal.jsx";
import ItemsTableModal from "./ItemsTableModal.jsx";
import ClientFormModal from "./ClientFormModal.jsx";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../config/supabaseClient.js";
import { useToast } from "../ui/use-toast.jsx";

export default function InvoiceForm({ isOpen, onClose, refresh }) {
  const { toast } = useToast();

  // --- Facture ---
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [description, setDescription] = useState(""); // colonne description

  // --- Client ---
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientRCCM, setClientRCCM] = useState("");
  const [clientIFU, setClientIFU] = useState("");
  const [clientTel, setClientTel] = useState("");

  const [clients, setClients] = useState([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // --- Période ---
  const [periodeDebut, setPeriodeDebut] = useState("");
  const [periodeFin, setPeriodeFin] = useState("");

  // --- Tableaux ---
  const [summaryData, setSummaryData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);

  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // --- Charger clients ---
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
    }
  }, [clientId, clients]);

  // --- Génération PDF automatique ---
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
        description,
        periode: periodeDebut && periodeFin ? `${periodeDebut} au ${periodeFin}` : "",
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
    description,
    periodeDebut,
    periodeFin,
    summaryData,
    itemsData,
  ]);

  if (!isOpen) return null;

  // --- Générer PDF ---
  const handleGeneratePDF = () => {
    const invoiceData = {
      invoiceNumber,
      clientName,
      clientAddress,
      clientRCCM,
      clientIFU,
      clientTel,
      description,
      periode: periodeDebut && periodeFin ? `${periodeDebut} au ${periodeFin}` : "",
      summaryData,
      itemsData,
    };
    const doc = generateInvoicePDF(invoiceData);
    doc.save(`${invoiceNumber || "facture"}.pdf`);
  };

  // --- Sauvegarder dans Supabase ---
  const handleSave = async () => {
    if (!clientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("invoices").insert([{
        client_id: clientId,
        client_name: clientName,
        description,
        amount: summaryData.reduce((acc, s) => acc + Number(s.amount || 0), 0),
        date_created: new Date().toISOString(),
        due_date: periodeFin || null,
        status: "en_attente",
        periode_debut: periodeDebut || null,
        periode_fin: periodeFin || null
      }]);
      if (error) throw error;
      toast({ title: "Facture enregistrée", description: "La facture a été sauvegardée avec succès." });
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
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="text-blue-600" /> Nouvelle Facture
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X size={22} />
          </button>
        </div>

        {/* Formulaire */}
        <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-2">

          {/* Numéro de facture */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Numéro de facture</label>
            <input
              type="text"
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ex: N001-08/BAT/2025"
            />
          </div>

          {/* Sélect client */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Client</label>
            <div className="flex gap-2">
              <select
                className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                value={clientId || ""}
                onChange={(e) => setClientId(Number(e.target.value))}
              >
                <option value="">-- Sélectionner un client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button onClick={() => setIsClientModalOpen(true)} className="px-3 py-2">
                + Nouveau
              </Button>
            </div>
          </div>

          {/* Adresse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Adresse" value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="RCCM" value={clientRCCM} onChange={e => setClientRCCM(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="IFU" value={clientIFU} onChange={e => setClientIFU(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
            <input type="text" placeholder="Téléphone" value={clientTel} onChange={e => setClientTel(e.target.value)} className="p-2 border rounded-md w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Transport de Minerai Ore" className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
          </div>

          {/* Période */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Période</label>
            <div className="flex gap-2 items-center mt-1">
              <input type="date" className="p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)} required/>
              <span className="text-gray-600 dark:text-gray-400">au</span>
              <input type="date" className="p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)} required/>
            </div>
          </div>

          {/* Boutons modaux */}
          <div className="flex flex-wrap gap-3 pt-3">
            <Button onClick={() => setIsSummaryModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition">Remplir Tableau Résumé</Button>
            <Button onClick={() => setIsItemsModalOpen(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition">Remplir Tableau Détails</Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button onClick={handleGeneratePDF} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow transition">Générer le PDF</Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md shadow transition">Enregistrer</Button>
          {pdfBlobUrl && (
            <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow transition">
              Aperçu PDF
            </a>
          )}
        </div>

        {/* Modals enfants */}
        <SummaryTableModal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} onUpdate={setSummaryData}/>
        <ItemsTableModal isOpen={isItemsModalOpen} onClose={() => setIsItemsModalOpen(false)} onUpdate={setItemsData}/>
        <ClientFormModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onClientAdded={handleClientAdded}/>
      </div>
    </div>
  );
}
