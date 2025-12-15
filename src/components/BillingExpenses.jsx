// src/pages/BillingExpenses.js
import React, { useEffect, useState } from "react";
import Tabs from "../components/ui/tabs.jsx";
import { supabase } from "../config/supabaseClient.js";
import InvoicesList from "../components/billing/InvoicesList.jsx";
import ExpensesList from "../components/billing/ExpensesList.jsx";
import FinanceChart from "../components/billing/FinanceChart.jsx";
import InvoiceForm from "../components/billing/InvoiceForm.jsx";
import ExpenseForm from "../components/billing/ExpenseForm.jsx";
import { DollarSign, TrendingUp, TrendingDown, LayoutDashboard, Plus, File, FileText } from "lucide-react";
import { Button } from "../components/ui/button.jsx";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../components/ui/use-toast.jsx";

// Loading spinner pour UX
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-10 bg-white/95 dark:bg-gray-800 rounded-xl shadow-lg min-h-[200px]">
    <svg className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <span className="ml-3 text-gray-600 dark:text-gray-300">Chargement des données financières...</span>
  </div>
);

export default function BillingExpenses() {
  const { toast } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [camions, setCamions] = useState([]);
  const [totals, setTotals] = useState({ invoices: 0, expenses: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: inv }, { data: exp }, { data: veh }] = await Promise.all([
        supabase.from("invoices").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("camions").select("id, immatriculation"),
      ]);

      setInvoices(inv || []);
      setExpenses(exp || []);
      setCamions(veh || []);

      const totalInvoices = (inv || []).reduce((acc, f) => acc + Number(f?.amount || 0), 0);
      const totalExpenses = (exp || []).reduce((acc, d) => acc + Number(d?.amount || 0), 0);

      setTotals({
        invoices: totalInvoices,
        expenses: totalExpenses,
        balance: totalInvoices - totalExpenses,
      });
    } catch (err) {
      console.error("Erreur fetch billing:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données financières",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currencyFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  });

  const StatCard = ({ title, value, colorClass, icon: Icon, description }) => (
    <div className={`bg-white/95 dark:bg-gray-800 shadow-xl rounded-2xl p-6 border-l-4 ${colorClass}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
          <p className={`mt-1 text-3xl font-extrabold ${colorClass.replace("border-l-4 ", "").replace("border-", "text-")}`}>
            {currencyFormatter.format(value)}
          </p>
        </div>
        <div className={`p-3 rounded-full ${colorClass.replace("border-l-4 border-", "bg-")} bg-opacity-10 dark:bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${colorClass.replace("border-l-4 border-", "text-")}`} />
        </div>
      </div>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{description}</p>}
    </div>
  );

  const exportExcel = () => {
    const wsData = [...invoices.map(i => ({ Type: "Facture", ...i })), ...expenses.map(e => ({ Type: "Dépense", ...e }))];
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finance");
    XLSX.writeFile(wb, "finance.xlsx");
    toast({ title: "Export Excel", description: "Fichier exporté avec succès." });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Finance - Factures & Dépenses", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Type", "Montant", "Camion", "Date", "Description"]],
      body: [
        ...invoices.map(i => ["Facture", currencyFormatter.format(i.amount), i.camion_id || "-", new Date(i.date_created).toLocaleDateString(), i.description || "-"]),
        ...expenses.map(e => ["Dépense", currencyFormatter.format(e.amount), e.camion_id || "-", new Date(e.date).toLocaleDateString(), e.description || "-"]),
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] },
    });

    doc.save("finance.pdf");
    toast({ title: "Export PDF", description: "Document généré avec succès." });
  };

  return (
    <>
      <div className="space-y-8">
        {/* EN-TÊTE & ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-3 mb-4 md:mb-0">
            <LayoutDashboard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Gestion Financière
          </h1>
          <div className="flex gap-3 flex-wrap">
            <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800" onClick={() => setIsInvoiceModalOpen(true)}>
              <Plus size={18} /> Ajouter Facture
            </Button>
            <Button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800" onClick={() => setIsExpenseModalOpen(true)}>
              <Plus size={18} /> Ajouter Dépense
            </Button>
            <Button className="flex items-center gap-2 border border-gray-300 bg-gray-100 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200" onClick={exportExcel}>
              <File size={16} /> Excel
            </Button>
            <Button className="flex items-center gap-2 border border-gray-300 bg-gray-100 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200" onClick={exportPDF}>
              <FileText size={16} /> PDF
            </Button>
          </div>
        </div>

        {/* Cartes synthèse */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total Factures" value={totals.invoices} colorClass="border-green-600" icon={TrendingUp} description="Total des revenus facturés." />
          <StatCard title="Total Dépenses" value={totals.expenses} colorClass="border-red-600" icon={TrendingDown} description="Somme des dépenses." />
          <StatCard title="Solde Net" value={totals.balance} colorClass={totals.balance >= 0 ? "border-blue-600" : "border-red-600"} icon={DollarSign} description="Factures - Dépenses." />
        </div>

        {/* Graphique */}
        <div className="bg-white/95 dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Aperçu Financier</h3>
          {loading ? <LoadingSpinner /> : <FinanceChart invoices={invoices} expenses={expenses} />}
        </div>

        {/* Tabs Factures / Dépenses */}
        <Tabs
          defaultValue="invoices"
          tabs={[
            {
              label: "Factures",
              value: "invoices",
              content: loading ? (
                <LoadingSpinner />
              ) : invoices.length ? (
                <InvoicesList invoices={invoices} refresh={fetchData} />
              ) : (
                <div className="p-6 bg-white/95 dark:bg-gray-800 rounded-lg shadow-md border border-dashed border-gray-300 dark:border-gray-700 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Aucune facture enregistrée.</p>
                  <button onClick={() => setIsInvoiceModalOpen(true)} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Ajouter votre première facture</button>
                </div>
              ),
            },
            {
              label: "Dépenses",
              value: "expenses",
              content: loading ? (
                <LoadingSpinner />
              ) : expenses.length ? (
                <ExpensesList expenses={expenses} refresh={fetchData} camions={camions} />
              ) : (
                <div className="p-6 bg-white/95 dark:bg-gray-800 rounded-lg shadow-md border border-dashed border-gray-300 dark:border-gray-700 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Aucune dépense enregistrée.</p>
                  <button onClick={() => setIsExpenseModalOpen(true)} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Ajouter votre première dépense</button>
                </div>
              ),
            },
          ]}
        />

        {/* Modals */}
        <InvoiceForm isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} refresh={fetchData} />
        <ExpenseForm isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} refresh={fetchData} camions={camions} />
      </div>
    </>
  );
}
