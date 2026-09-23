import React, { useEffect, useState, useCallback } from "react";
import Tabs from "../components/ui/tabs.jsx";
import { supabase } from "../config/supabaseClient.js";
import InvoicesList from "../components/billing/InvoicesList.jsx";
import GTSInvoicesList from "../components/billing/GTSInvoicesList.jsx";
import ExpensesList from "../components/billing/ExpensesList.jsx";
import FinanceChart from "../components/billing/FinanceChart.jsx";
import InvoiceForm from "../components/billing/InvoiceFormContainer.jsx";
import GTSInvoiceForm from "../components/billing/GTSInvoiceForm.jsx";
import ExpenseForm from "../components/billing/ExpenseForm.jsx";
import { DollarSign, TrendingUp, TrendingDown, LayoutDashboard, Plus, Receipt } from "lucide-react";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../components/ui/use-toast.jsx";

export default function BillingExpenses({ role, structure }) {
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const [baticomInvoices, setBaticomInvoices] = useState([]);
  const [gtsInvoices, setGtsInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [camions, setCamions] = useState([]);
  const [totals, setTotals] = useState({ invoices: 0, expenses: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  // États des Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isGTSInvoiceModalOpen, setIsGTSInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingGTSInvoice, setEditingGTSInvoice] = useState(null);

  // ==========================================
  // 1. CHARGEMENT DES DONNÉES (FILTRÉ)
  // ==========================================
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // --- LOGIQUE ADMIN : TOUT RÉCUPÉRER ---
        const [resInvB, resInvG, resExp, resVeh] = await Promise.all([
          supabase.from("invoices").select("*"),
          supabase.from("invoices_gts").select("*"),
          supabase.from("expenses").select("*"),
          supabase.from("camions").select("id, immatriculation, structure"),
        ]);

        const invB = resInvB.data || [];
        const invG = resInvG.data || [];
        const exp = resExp.data || [];

        setBaticomInvoices(invB);
        setGtsInvoices(invG);
        setExpenses(exp);
        setCamions(resVeh.data || []);

        const totalIn = invB.reduce((acc, f) => acc + Number(f?.amount || 0), 0) +
                        invG.reduce((acc, f) => acc + Number(f?.amount || 0), 0);
        const totalEx = exp.reduce((acc, d) => acc + Number(d?.amount || 0), 0);

        setTotals({ invoices: totalIn, expenses: totalEx, balance: totalIn - totalEx });
      } else {
        // --- LOGIQUE SUPERVISEUR : FILTRER PAR STRUCTURE ---
        const [resExp, resVeh] = await Promise.all([
          supabase.from("expenses").select("*").eq("structure", structure),
          supabase.from("camions").select("id, immatriculation, structure").eq("structure", structure),
        ]);

        const exp = resExp.data || [];
        setExpenses(exp);
        setCamions(resVeh.data || []);
        
        const totalEx = exp.reduce((acc, d) => acc + Number(d?.amount || 0), 0);
        setTotals({ invoices: 0, expenses: totalEx, balance: 0 });
      }
    } catch (err) {
      console.error("Erreur fetch:", err);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, structure, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currencyFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "XOF", minimumFractionDigits: 0,
  });

  const handleOpenBaticom = (invoice = null) => { setEditingInvoice(invoice); setIsInvoiceModalOpen(true); };
  const handleOpenGTS = (invoice = null) => { setEditingGTSInvoice(invoice); setIsGTSInvoiceModalOpen(true); };

  // ==========================================
  // RENDER : INTERFACE SUPERVISEUR
  // ==========================================
  if (!isAdmin) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center border-b pb-4 border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
            <Receipt className="text-red-600" /> Dépenses {structure}
          </h1>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white">
            <Plus size={18} className="mr-2" /> Ajouter une Dépense
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border-l-4 border-red-600 max-w-sm">
          <h3 className="text-xs font-bold text-gray-500 uppercase">Total Dépenses</h3>
          <p className="text-3xl font-black text-red-600">{currencyFormatter.format(totals.expenses)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <ExpensesList expenses={expenses} camions={camions} refresh={fetchData} emptyMessage={`Aucune dépense pour ${structure}.`} />
        </div>

        <ExpenseForm isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} refresh={fetchData} camions={camions} defaultStructure={structure} />
      </div>
    );
  }

  // ==========================================
  // RENDER : INTERFACE ADMIN (COMPLÈTE)
  // ==========================================
  return (
    <div className="space-y-8 p-2 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-blue-600" /> Gestion Financière Globale
        </h1>
        <div className="flex gap-3 flex-wrap mt-4 md:mt-0">
          <Button onClick={() => handleOpenBaticom()} className="bg-green-600 text-white hover:bg-green-700">
            <Plus size={18} className="mr-1" /> BATICOM
          </Button>
          <Button onClick={() => handleOpenGTS()} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus size={18} className="mr-1" /> GTS
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-red-600 text-white hover:bg-red-700">
            <Plus size={18} className="mr-1" /> Dépense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-green-600">
          <h3 className="text-xs font-bold text-gray-500 uppercase">Total Revenus</h3>
          <p className="text-2xl font-black text-green-600">{currencyFormatter.format(totals.invoices)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-red-600">
          <h3 className="text-xs font-bold text-gray-500 uppercase">Total Dépenses</h3>
          <p className="text-2xl font-black text-red-600">{currencyFormatter.format(totals.expenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-blue-600">
          <h3 className="text-xs font-bold text-gray-500 uppercase">Solde Net</h3>
          <p className="text-2xl font-black text-blue-600">{currencyFormatter.format(totals.balance)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4">Aperçu Financier</h3>
        {!loading && <FinanceChart invoices={[...baticomInvoices, ...gtsInvoices]} expenses={expenses} />}
      </div>

      <Tabs
        defaultValue="baticom"
        tabs={[
          { label: "BATICOM", value: "baticom", content: <InvoicesList invoices={baticomInvoices} type="baticom" onEdit={handleOpenBaticom} refresh={fetchData} /> },
          { label: "GTS Logistics", value: "gts", content: <GTSInvoicesList invoices={gtsInvoices} onEdit={handleOpenGTS} refresh={fetchData} /> },
          { label: "Dépenses Globales", value: "expenses", content: <ExpensesList expenses={expenses} camions={camions} refresh={fetchData} /> },
        ]}
      />

      <InvoiceForm isOpen={isInvoiceModalOpen} onClose={() => {setIsInvoiceModalOpen(false); setEditingInvoice(null);}} refresh={fetchData} initialData={editingInvoice} />
      <GTSInvoiceForm isOpen={isGTSInvoiceModalOpen} onClose={() => {setIsGTSInvoiceModalOpen(false); setEditingGTSInvoice(null);}} refresh={fetchData} initialData={editingGTSInvoice} />
      <ExpenseForm isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} refresh={fetchData} camions={camions} />
    </div>
  );
}