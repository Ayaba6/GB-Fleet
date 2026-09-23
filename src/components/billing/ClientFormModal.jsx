// src/components/billing/ClientFormModal.jsx
import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../config/supabaseClient.js";
import { useToast } from "../ui/use-toast.jsx";

export default function ClientFormModal({ isOpen, onClose, onClientAdded }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [rccm, setRCCM] = useState("");
  const [ifu, setIFU] = useState("");
  const [phone, setPhone] = useState(""); // <-- corrigé
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddClient = async () => {
    if (!name || !address) {
      toast({ title: "Erreur", description: "Le nom et l'adresse sont obligatoires.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert([{ name, address, rccm, ifu, phone }]) // <-- corrigé
        .select()
        .single();
      if (error) throw error;
      toast({ title: "Client ajouté", description: `Le client ${data.name} a été enregistré.` });
      onClientAdded(data); // retourne le client ajouté pour pré-remplir InvoiceForm
      onClose();
      setName(""); setAddress(""); setRCCM(""); setIFU(""); setPhone(""); // <-- corrigé
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserPlus className="text-blue-600" /> Nouveau Client
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          <input type="text" placeholder="Nom du client" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
          <input type="text" placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
          <input type="text" placeholder="RCCM" value={rccm} onChange={(e) => setRCCM(e.target.value)} className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
          <input type="text" placeholder="IFU" value={ifu} onChange={(e) => setIFU(e.target.value)} className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/>
          <input type="text" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"/> {/* corrigé */}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button onClick={handleAddClient} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md" disabled={loading}>
            Ajouter Client
          </Button>
        </div>
      </div>
    </div>
  );
}
