// src/pages/BillingExpenses.js
import React, { useEffect, useState } from "react";
import Tabs from "../components/ui/tabs.jsx";
import { supabase } from "../config/supabaseClient.js";
import InvoicesList from "../components/billing/InvoicesList.jsx";
import GTSInvoicesList from "../components/billing/InvoicesList.jsx";
import ExpensesList from "../components/billing/ExpensesList.jsx";
import FinanceChart from "../components/billing/FinanceChart.jsx";
import InvoiceForm from "../components/billing/InvoiceFormContainer.jsx"; // BATICOM
import GTSInvoiceForm from "../components/billing/GTSInvoiceForm.jsx"; // GTS
import ExpenseForm from "../components/billing/ExpenseForm.jsx";
import { DollarSign, TrendingUp, TrendingDown, LayoutDashboard, Plus } from "lucide-react";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../components/ui/use-toast.jsx";

export default function BillingExpenses() {
  const { toast } = useToast();

  const [baticomInvoices, setBaticomInvoices] = useState([]);
  const [gtsInvoices, setGtsInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [camions, setCamions] = useState([]);
  const [totals, setTotals] = useState({ invoices: 0, expenses: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isGTSInvoiceModalOpen, setIsGTSInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // --- Chargement des données ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ { data: invB }, { data: invG }, { data: exp }, { data: veh } ] = await Promise.all([
        supabase.from("invoices").select("*"),
        supabase.from("invoices_gts").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("camions").select("id, immatriculation"),
      ]);

      setBaticomInvoices(invB || []);
      setGtsInvoices(invG || []);
      setExpenses(exp || []);
      setCamions(veh || []);

      const totalInvoices = (invB || []).reduce((acc, f) => acc + Number(f?.amount || 0), 0)
                         + (invG || []).reduce((acc, f) => acc + Number(f?.amount || 0), 0);
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

  return (
    <div className="space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-3 mb-4 md:mb-0">
          <LayoutDashboard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Gestion Financière
        </h1>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => setIsInvoiceModalOpen(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Plus size={18} /> Ajouter Facture BATICOM
          </Button>
          <Button onClick={() => setIsGTSInvoiceModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={18} /> Ajouter Facture GTS
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Plus size={18} /> Ajouter Dépense
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
        {loading ? <p>Chargement...</p> : <FinanceChart invoices={[...baticomInvoices, ...gtsInvoices]} expenses={expenses} />}
      </div>

      {/* Tabs Factures / Dépenses */}
      <Tabs
        defaultValue="invoices"
        tabs={[
          {
            label: "Factures BATICOM",
            value: "baticom",
            content: loading ? <p>Chargement...</p> : <InvoicesList invoices={baticomInvoices} refresh={fetchData} />
          },
          {
            label: "Factures GTS",
            value: "gts",
            content: loading ? <p>Chargement...</p> : <GTSInvoicesList invoices={gtsInvoices} refresh={fetchData} />
          },
          {
            label: "Dépenses",
            value: "expenses",
            content: loading ? <p>Chargement...</p> : <ExpensesList expenses={expenses} refresh={fetchData} camions={camions} />
          },
        ]}
      />

      {/* Modals */}
      <InvoiceForm isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} refresh={fetchData} />
      <GTSInvoiceForm isOpen={isGTSInvoiceModalOpen} onClose={() => setIsGTSInvoiceModalOpen(false)} refresh={fetchData} />
      <ExpenseForm isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} refresh={fetchData} camions={camions} />
    </div>
  );
}
