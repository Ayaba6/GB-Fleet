import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import UserModal from "./modals/UserModal.jsx";
import { Pencil, Trash2, Users, FileText, User, Mail, Phone, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Documents utilisateur ---
const renderDocuments = (u) => {
  const docs = [];
  const addDoc = (url, label, expiry) => {
    if (url)
      docs.push(
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
        >
          <FileText size={14} /> {label} {expiry && <span className="text-xs text-gray-500 dark:text-gray-300">({new Date(expiry).toLocaleDateString()})</span>}
        </a>
      );
  };
  addDoc(u.cniburl, "CNIB", u.cnibexpiry);
  addDoc(u.permisurl, "Permis", u.permisexpiry);
  addDoc(u.carteurl, "Carte", u.carteexpiry);
  addDoc(u.actenaissanceurl, "Acte de naissance", u.actenaissanceexpiry);
  return docs.length ? <div className="flex flex-col gap-1 mt-1">{docs}</div> : <span className="text-gray-400 italic text-sm">Aucun document</span>;
};

export default function UserSection() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [structureFilter, setStructureFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    else setUsers(data || []);
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", userToDelete.id);
      if (error) throw error;
      toast({ title: "Utilisateur supprimé", description: `Le compte "${userToDelete.name}" a été supprimé.` });
      fetchUsers();
      setUserToDelete(null);
      setConfirmOpen(false);
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (u) => { setEditingUser(u); setShowModal(true); };
  const handleAdd = () => { setEditingUser(null); setShowModal(true); };

  const filteredUsers = users.filter(
    (u) =>
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (roleFilter === "" || u.role === roleFilter) &&
      (structureFilter === "" || u.structure === structureFilter)
  );

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportExcel = () => {
    const wsData = filteredUsers.map((u) => ({
      Nom: u.name,
      Email: u.email,
      Rôle: u.role,
      Structure: u.structure || "",
      Téléphone: u.phone || "",
      "Date création": new Date(u.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Utilisateurs");
    XLSX.writeFile(wb, "liste_utilisateurs.xlsx");
    toast({ title: "Export Excel", description: "Liste exportée." });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Liste des Utilisateurs", 14, 20);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [["Nom", "Email", "Rôle", "Structure", "Téléphone", "Date"]],
      body: filteredUsers.map((u) => [u.name, u.email, u.role, u.structure || "", u.phone || "", new Date(u.created_at).toLocaleDateString()]),
      theme: "grid",
      styles: { fontSize: 9 },
    });
    doc.save("liste_utilisateurs.pdf");
    toast({ title: "Export PDF", description: "Le document a été généré." });
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 container animate-fadeInUp">
      {/* Header */}
      <Card className="shadow-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Users size={24} className="text-blue-600 dark:text-blue-400" /> Gestion des utilisateurs
          </h2>
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            + Créer utilisateur
          </Button>
        </CardHeader>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="flex-1 min-w-[150px] border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-600"
        >
          <option value="">Tous rôles</option>
          <option value="chauffeur">Chauffeur</option>
          <option value="admin">Admin</option>
          <option value="superviseur">Superviseur</option>
        </select>
        <select
          value={structureFilter}
          onChange={(e) => { setStructureFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-600"
        >
          <option value="">Toutes structures</option>
          <option value="GTS">GTS</option>
          <option value="BATICOM">BATICOM</option>
        </select>

        <div className="flex gap-2">
          <Button onClick={exportExcel} variant="outline" className="border-green-500 text-green-600 dark:text-green-400">Excel</Button>
          <Button onClick={exportPDF} variant="outline" className="border-red-500 text-red-600 dark:text-red-400">PDF</Button>
        </div>
      </div>

      {/* Liste utilisateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedUsers.length === 0 ? (
          <p className="text-center col-span-full text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
        ) : (
          paginatedUsers.map((u) => (
            <Card key={u.id} className="shadow-lg p-4 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <User size={18} /> {u.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"><Mail size={14} /> {u.email}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1"><Phone size={14} /> {u.phone || "-"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    <b>Rôle:</b> {u.role} | <b>Structure:</b> {u.structure || "-"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(u)} className="bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-600/60 transition">
                    <Pencil size={16} className="text-gray-800 dark:text-gray-200 opacity-80 hover:opacity-100 transition" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => { setUserToDelete(u); setConfirmOpen(true); }} className="bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-600/60 transition">
                    <Trash2 size={16} className="text-red-600 dark:text-red-400 opacity-80 hover:opacity-100 transition" />
                  </Button>
                </div>
              </div>

              <div className="mt-3">{renderDocuments(u)}</div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Calendar size={12} /> Créé le {new Date(u.created_at).toLocaleDateString()}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={i + 1 === currentPage ? "bg-blue-600 text-white" : ""}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && <UserModal editingUser={editingUser} setShowModal={setShowModal} fetchUsers={fetchUsers} />}
      <ConfirmDialog
        open={confirmOpen}
        onClose={setConfirmOpen}
        title="Supprimer cet utilisateur ?"
        description={`Êtes-vous sûr de vouloir supprimer "${userToDelete?.name}" ?`}
        confirmLabel="Supprimer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
