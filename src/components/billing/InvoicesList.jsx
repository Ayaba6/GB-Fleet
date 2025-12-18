import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { useToast } from "../ui/use-toast.jsx";
import InvoicesList from "./InvoicesList.jsx";
import InvoiceForm from "./InvoiceFormContainer.jsx";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const { toast } = useToast();

  // --- Récupérer toutes les factures ---
  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("date_created", { ascending: false });

    if (error) {
      console.error("Erreur fetch invoices:", error);
      toast({ title: "Erreur", description: "Impossible de récupérer les factures", variant: "destructive" });
    } else {
      setInvoices(data || []);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // --- Rafraîchir après ajout / suppression / édition ---
  const refresh = () => fetchInvoices();

  // --- Gestion ajout / édition ---
  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingInvoice(null);
    setIsInvoiceModalOpen(false);
    refresh();
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Gestion des Factures GTS</h1>

      <InvoicesList
        invoices={invoices}
        refresh={refresh}
        onAdd={handleAddInvoice}
        onEdit={handleEditInvoice} // possibilité d'édition depuis la liste
      />

      {isInvoiceModalOpen && (
        <InvoiceForm
          isOpen={isInvoiceModalOpen}
          onClose={handleCloseModal}
          refresh={refresh}
          initialData={editingInvoice}
        />
      )}
    </div>
  );
}
