// src/components/UserSection.jsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import UserModal from "./modals/UserModal.jsx";
import { Pencil, Trash2, Users, FileText, File } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const renderDocuments = (u) => {
  const docs = [];
  const addDoc = (url, label) => {
    if (url)
      docs.push(
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
        >
          <FileText size={14} /> {label}
        </a>
      );
  };

  addDoc(u.cniburl, "CNIB");
  addDoc(u.permisurl, "Permis");
  addDoc(u.carteurl, "Carte");
  addDoc(u.actenaissanceurl, "Acte de naissance");

  return docs.length ? <div className="flex flex-col gap-1">{docs}</div> : <span className="text-gray-400 italic">Aucun</span>;
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error)
      toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
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
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    });
    doc.save("liste_utilisateurs.pdf");
    toast({ title: "Export PDF", description: "Le document a été généré." });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 container animate-fadeInUp">
      <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex justify-between items-center p-4 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Users size={24} className="text-blue-600 dark:text-blue-400" /> Gestion des utilisateurs
          </h2>
          <Button onClick={handleAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            + Créer utilisateur
          </Button>
        </CardHeader>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="🔍 Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-36 border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          >
            <option value="">Tous rôles</option>
            <option value="chauffeur">Chauffeur</option>
            <option value="admin">Admin</option>
            <option value="superviseur">Superviseur</option>
          </select>
          <select
            value={structureFilter}
            onChange={(e) => { setStructureFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-36 border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          >
            <option value="">Toutes structures</option>
            <option value="GTS">GTS</option>
            <option value="BATICOM">BATICOM</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end w-full md:w-auto mt-2 md:mt-0">
          <Button onClick={exportExcel} variant="outline" className="flex items-center gap-1 border-green-500 text-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-700/20">
            <File size={16} /> Excel
          </Button>
          <Button onClick={exportPDF} variant="outline" className="flex items-center gap-1 border-red-500 text-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-700/20">
            <FileText size={16} /> PDF
          </Button>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Nom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Téléphone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Rôle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Structure</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 hidden lg:table-cell">Documents</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Créé le</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {paginatedUsers.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</td></tr>
            ) : (
              paginatedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition">
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{u.name}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{u.phone || "-"}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">{u.structure || "-"}</td>
                  <td className="px-4 py-2 hidden lg:table-cell">{renderDocuments(u)}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(u)}><Pencil size={16} /></Button>
                    <Button variant="destructive" size="sm" onClick={() => { setUserToDelete(u); setConfirmOpen(true); }}><Trash2 size={16} /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={i + 1 === currentPage ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600" : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}
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
