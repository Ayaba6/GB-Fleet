// src/components/AdminSidebar.jsx
import React from "react";
import {
  LayoutDashboard,
  Users,
  Truck,
  ClipboardList,
  Wrench,
  FileWarning,
  DollarSign,
  LogOut,
  X,
  Menu
} from "lucide-react";

export default function AdminSidebar({
  user,
  section,
  setSection,
  handleLogout,
  menuOpen,
  setMenuOpen,
}) {
  const menuItems = [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { key: "users", label: "Utilisateurs", icon: Users },
    { key: "camions", label: "Véhicules", icon: Truck },
    { key: "missions", label: "Missions", icon: ClipboardList },
    { key: "pannes", label: "Alertes Pannes", icon: Wrench },
    { key: "documents", label: "Alertes Documents", icon: FileWarning },
    { key: "billing", label: "Facturation", icon: DollarSign },
  ];

  return (
    <>
      {/* Bouton Menu Mobile */}
      <div className="md:hidden fixed top-3 left-3 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg">
        <button onClick={() => setMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col bg-white dark:bg-gray-800 w-64 shadow-lg h-screen sticky top-0">
        {/* Profil */}
        <div className="flex flex-col items-center py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-600 mb-3">
            <img
              src={
                user?.avatar || "https://i.pravatar.cc/150?u=" + user?.id
              }
              alt="Profil"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-gray-900 dark:text-white font-bold text-lg truncate text-center">
            {user?.full_name || user?.email}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 mt-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg font-medium transition ${
                section === item.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-700 dark:text-red-400 transition"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile avec animation */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
      >
        {/* Fond semi-transparent */}
        <div
          className="absolute inset-0 bg-black bg-opacity-40"
          onClick={() => setMenuOpen(false)}
        ></div>

        {/* Contenu Sidebar */}
        <aside className="relative bg-white dark:bg-gray-800 w-64 h-full shadow-2xl p-6 flex flex-col">
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-4 right-4 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1"
          >
            <X size={24} />
          </button>

          {/* Profil */}
          <div className="flex flex-col items-center mt-6 mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-600 mb-3">
              <img
                src={
                  user?.avatar || "https://i.pravatar.cc/150?u=" + user?.id
                }
                alt="Profil"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-gray-900 dark:text-white font-bold text-lg truncate text-center">
              {user?.full_name || user?.email}
            </p>
          </div>

          {/* Menu */}
          <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setSection(item.key);
                  setMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg font-medium transition ${
                  section === item.key
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Déconnexion */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-700 dark:text-red-400 transition"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
