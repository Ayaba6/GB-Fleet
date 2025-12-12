import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { Truck, Wrench, Waypoints, Fuel, Loader2, Scale, BarChart3, Calendar } from "lucide-react";

// --- Composant DateRangePicker simplifié ---
const DateRangePicker = ({ startDate, setStartDate, endDate, setEndDate }) => (
  <div className="flex space-x-2 items-center text-sm text-gray-700 dark:text-gray-300">
    <Calendar size={18} className="text-blue-500" />
    <span className="font-semibold">Période:</span>
    <input 
      type="date" 
      value={startDate ? startDate.toISOString().split('T')[0] : ''}
      onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
      className="p-1 border rounded text-gray-900 dark:text-gray-900"
    />
    <span>à</span>
    <input 
      type="date" 
      value={endDate ? endDate.toISOString().split('T')[0] : ''}
      onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
      className="p-1 border rounded text-gray-900 dark:text-gray-900"
    />
  </div>
);

// --- StatCard pour l'affichage des KPIs ---
const StatCard = ({ icon: Icon, title, value, colorClass }) => (
  <div className={`p-4 rounded-xl shadow-lg border ${colorClass} transition-shadow duration-300 hover:shadow-xl`}>
    <div className="flex items-center justify-between">
      <Icon size={24} className="opacity-80" /> 
      <span className="text-2xl font-extrabold">{value}</span>
    </div>
    <p className="mt-1 text-sm font-medium opacity-80">{title}</p>
  </div>
);

export default function CamionSummaryModal({ camion, open, setOpen }) {
  const { toast } = useToast();
  const [missionsGTS, setMissionsGTS] = useState([]);
  const [journeesBaticom, setJourneesBaticom] = useState([]);
  const [pannes, setPannes] = useState([]);
  const [loading, setLoading] = useState(true);

  const defaultEndDate = new Date();
  const defaultStartDate = new Date(defaultEndDate.getFullYear(), defaultEndDate.getMonth(), 1);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // --- FETCH DATA ---
  const fetchData = async () => {
    if (!camion || !startDate || !endDate) {
      setMissionsGTS([]);
      setJourneesBaticom([]);
      setPannes([]);
      return;
    }
    setLoading(true);
    try {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      if (camion.structure === "GTS") {
        const missions = await fetchMissionsGTS(endOfDay);
        await fetchPannesGTS(missions, endOfDay);
      } else if (camion.structure === "BATICOM") {
        const journees = await fetchJourneesBaticom(endOfDay);
        await fetchPannesBaticom(journees, endOfDay);
      }
    } catch (err) {
      toast({ title: "Erreur de chargement", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- GTS ---
  const fetchMissionsGTS = async (endOfDay) => {
    const { data, error } = await supabase
      .from("missions_gts")
      .select("*")
      .eq("camion_id", camion.id)
      .gte("date_depart", startDate.toISOString())
      .lte("date_depart", endOfDay.toISOString())
      .order("date_depart", { ascending: false });
    if (error) throw error;
    setMissionsGTS(data || []);
    return data || [];
  };

  const fetchPannesGTS = async (missions, endOfDay) => {
    if (!missions.length) {
      setPannes([]);
      return;
    }
    const { data, error } = await supabase
      .from("alertespannes")
      .select("*")
      .in("mission_id", missions.map(m => m.id))
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });
    if (error) throw error;
    setPannes(data || []);
  };

  // --- BATICOM ---
  const fetchJourneesBaticom = async (endOfDay) => {
    const { data, error } = await supabase
      .from("journee_baticom")
      .select("id, camion_id, voyages, tonnage, fuel_restant, fuel_complement, date")
      .eq("camion_id", camion.id)
      .gte("date", startDate.toISOString())
      .lte("date", endOfDay.toISOString())
      .order("date", { ascending: false });
    if (error) throw error;
    setJourneesBaticom(data || []);
    return data || [];
  };

  const fetchPannesBaticom = async (journees, endOfDay) => {
    if (!journees.length) {
      setPannes([]);
      return;
    }
    const { data, error } = await supabase
      .from("alertespannes")
      .select("*")
      .in("journee_id", journees.map(j => j.id))
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });
    if (error) throw error;
    setPannes(data || []);
  };

  useEffect(() => {
    if (open && camion) fetchData();
  }, [open, camion, startDate, endDate]);

  // --- Totaux GTS ---
  const totalGTS = missionsGTS.reduce(
    (acc, m) => ({
      missions: acc.missions + 1,
      voyages: acc.voyages + (m.voyages || 0),
      tonnage_charge: acc.tonnage_charge + (m.tonnage_charge || 0),
      tonnage_decharge: acc.tonnage_decharge + (m.tonnage_decharge || 0),
      total_fuel: acc.total_fuel + (m.frais_fuel || 0),
    }),
    { missions: 0, voyages: 0, tonnage_charge: 0, tonnage_decharge: 0, total_fuel: 0 }
  );
  const totalPannesGTS = pannes.filter(p => p.mission_id).length;

  // --- Totaux BATICOM ---
  const totalBaticom = journeesBaticom.reduce(
    (acc, j) => ({
      journees: acc.journees + 1,
      voyages: acc.voyages + (j.voyages || 0),
      tonnage: acc.tonnage + (j.tonnage || 0),
      fuel_total: acc.fuel_total + ((j.fuel_restant || 0) + (j.fuel_complement || 0)),
    }),
    { journees: 0, voyages: 0, tonnage: 0, fuel_total: 0 }
  );

  // ✅ Total pannes BATICOM exact par camion
  const totalPannesBaticom = journeesBaticom.reduce((acc, j) => {
    const pannesPourJournee = pannes.filter(p => p.journee_id === j.id);
    return acc + pannesPourJournee.length;
  }, 0);

  // --- Résumé par journée (optionnel)
  const pannesParJournee = journeesBaticom.map(j => ({
    date: j.date,
    nbPannes: pannes.filter(p => p.journee_id === j.id).length
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 sm:items-center">
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <Truck size={24} className="text-blue-600 dark:text-blue-400" /> 
            Résumé: {camion.immatriculation} ({camion.structure})
          </DialogTitle>
          <div className="mt-2 flex flex-wrap justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
              <div><strong>Type:</strong> {camion.type}</div>
              <div><strong>Modèle:</strong> {camion.marquemodele}</div>
              <div><strong>Statut:</strong> {camion.statut}</div>
              <div><strong>Structure:</strong> {camion.structure || "-"}</div>
            </div>
            <div className="mt-3 md:mt-0 w-full md:w-auto">
              <DateRangePicker
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
              />
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Chargement des données...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
            {camion.structure === "GTS" ? (
              <>
                <StatCard icon={Waypoints} title="Missions" value={totalGTS.missions} colorClass="bg-green-50 dark:bg-gray-800 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" />
                <StatCard icon={Wrench} title="Pannes" value={totalPannesGTS} colorClass="bg-red-50 dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" />
                <StatCard icon={Scale} title="Tonnage Chargé" value={`${totalGTS.tonnage_charge.toFixed(2)} T`} colorClass="bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" />
              </>
            ) : (
              <>
                <StatCard icon={Waypoints} title="Journées" value={totalBaticom.journees} colorClass="bg-green-50 dark:bg-gray-800 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" />
                <StatCard icon={Wrench} title="Pannes" value={totalPannesBaticom} colorClass="bg-red-50 dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" />
                <StatCard icon={Scale} title="Tonnage" value={`${totalBaticom.tonnage.toFixed(2)} T`} colorClass="bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" />
              </>
            )}
            <StatCard icon={BarChart3} title="Voyages" value={camion.structure === "GTS" ? totalGTS.voyages : totalBaticom.voyages} colorClass="bg-indigo-50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" />
            <StatCard icon={Fuel} title="Fuel Total" value={camion.structure === "GTS" ? `${totalGTS.total_fuel.toFixed(2)} L` : `${totalBaticom.fuel_total.toFixed(2)} L`} colorClass="bg-yellow-50 dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" />
          </div>
        )}

        <DialogFooter className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button onClick={() => setOpen(false)} variant="default" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
