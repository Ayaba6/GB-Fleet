import React, { useState, useMemo } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { LineChart as LineIcon, BarChart as BarIcon, PieChart as PieIcon, Calendar } from "lucide-react";

// Couleurs plus claires et alignées avec le dashboard
const COLORS = ["#10B981", "#EF4444"]; // Vert émeraude pour les factures, Rouge pour les dépenses

// 💡 Formatage de la devise (FCFA) pour les tooltips
const currencyFormatter = (value) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF', // Franc CFA
        minimumFractionDigits: 0
    }).format(value);
};

// 💡 Composant Tooltip Personnalisé
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-300 shadow-lg rounded-lg text-sm">
                <p className="font-bold text-gray-800 mb-1">{label}</p>
                {payload.map((p, index) => (
                    <p key={index} style={{ color: p.color }} className="mt-0.5">
                        {`${p.name}: ${currencyFormatter(p.value)}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function FinanceChart({ invoices = [], expenses = [] }) {
    const [chartType, setChartType] = useState("line");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- LOGIQUE DE FILTRAGE ET DE PRÉPARATION DES DONNÉES (inchangée) ---
    
    // Filtrage par période (basé sur la date d'échéance pour les factures et la date pour les dépenses)
    const filteredInvoices = useMemo(() => {
        return invoices.filter((f) => {
            if (!f.due_date) return false;
            const date = new Date(f.due_date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        });
    }, [invoices, startDate, endDate]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter((d) => {
            if (!d.date) return false;
            const date = new Date(d.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        });
    }, [expenses, startDate, endDate]);

    // Regroupement mensuel
    const data = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => i);
        return months.map((m) => {
            const factures = filteredInvoices
                .filter((f) => new Date(f.due_date).getMonth() === m)
                .reduce((acc, f) => acc + Number(f.amount || 0), 0);
            const depenses = filteredExpenses
                .filter((d) => new Date(d.date).getMonth() === m)
                .reduce((acc, d) => acc + Number(d.amount || 0), 0);
            return {
                month: new Date(0, m).toLocaleString("fr-FR", { month: "short" }),
                factures,
                depenses,
            };
        }).filter(item => item.factures > 0 || item.depenses > 0); // Enlever les mois vides
    }, [filteredInvoices, filteredExpenses]);

    // Données pour PieChart
    const pieData = useMemo(() => [
        { name: "Factures", value: filteredInvoices.reduce((acc, f) => acc + Number(f.amount || 0), 0) },
        { name: "Dépenses", value: filteredExpenses.reduce((acc, d) => acc + Number(d.amount || 0), 0) },
    ], [filteredInvoices, filteredExpenses]);
    
    // Sécuriser les données
    const safeData = Array.isArray(data) && data.length ? data : [{ month: "N/A", factures: 0, depenses: 0 }];
    const safePieData = Array.isArray(pieData) && pieData.length ? pieData : [{ name: "Factures", value: 0 }, { name: "Dépenses", value: 0 }];

    if (!filteredInvoices.length && !filteredExpenses.length) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500 font-medium">
                    Aucune donnée de facture ou de dépense n'est disponible pour cette période.
                </p>
                <p className="text-sm text-gray-400 mt-1">
                    Ajoutez des factures et des dépenses pour voir le graphique.
                </p>
            </div>
        );
    }

    // --- RENDU AVEC STYLE TAILWIND ---
    
    return (
        <div className="bg-white rounded-xl">
            {/* Sélecteurs Période & Type de Graphique */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                
                {/* Période */}
                <div className="flex flex-wrap gap-4 items-center">
                    <Calendar size={20} className="text-gray-500" />
                    <label className="text-sm text-gray-600 font-medium">Du:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <label className="text-sm text-gray-600 font-medium">Au:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>

                {/* Sélecteur de Type */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    {[{ type: "line", Icon: LineIcon }, { type: "bar", Icon: BarIcon }, { type: "pie", Icon: PieIcon }].map(({ type, Icon }) => (
                        <button
                            key={type}
                            onClick={() => setChartType(type)}
                            className={`p-2 rounded-md transition ${
                                chartType === type
                                    ? "bg-white shadow text-blue-600"
                                    : "text-gray-500 hover:bg-gray-200"
                            }`}
                            title={type === "line" ? "Évolution par Ligne" : type === "bar" ? "Comparaison par Barre" : "Répartition par Cercle"}
                        >
                            <Icon size={20} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Graphiques */}
            <div className="min-h-[300px]">
                {chartType === "line" && (
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={safeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis 
                                stroke="#6b7280" 
                                tickFormatter={currencyFormatter}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Line 
                                type="monotone" 
                                dataKey="factures" 
                                stroke={COLORS[0]} 
                                strokeWidth={2}
                                name="Revenus (Factures)"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="depenses" 
                                stroke={COLORS[1]} 
                                strokeWidth={2}
                                name="Dépenses"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {chartType === "bar" && (
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={safeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis 
                                stroke="#6b7280" 
                                tickFormatter={currencyFormatter}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="factures" fill={COLORS[0]} name="Revenus (Factures)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="depenses" fill={COLORS[1]} name="Dépenses" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {chartType === "pie" && (
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={safePieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                fill="#8884d8"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {safePieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}