import React from "react";
import { 
  LogOut, X, GaugeCircle, Users, Truck, ClipboardList, 
  AlertTriangle, FileWarning, CreditCard, Settings
} from "lucide-react";

const MENU_ITEMS = [
  { key: "dashboard", label: "Tableau de Bord", icon: GaugeCircle },
  { key: "users", label: "Utilisateurs", icon: Users },
  { key: "camions", label: "Flotte", icon: Truck },
  { key: "missions", label: "Missions", icon: ClipboardList },
  { key: "pannes", label: "Pannes", icon: AlertTriangle },
  { key: "maintenance", label: "Maintenance", icon: Settings },
  { key: "documents", label: "Documents", icon: FileWarning },
  { key: "billing", label: "Facturation", icon: CreditCard },
];

// ... reste du code inchangé

export default function AdminSidebar({
  user,
  section,
  setSection,
  handleLogout,
  menuOpen,
  setMenuOpen,
}) {
  return (
    <>
      {/* Overlay Mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-40"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-700 shadow-xl z-50
          transform transition-transform duration-300
          ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Barre mobile avec bouton fermer */}
        <div className="flex justify-end px-4 py-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <button
            className="p-2 rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            <X className="w-6 h-6 text-gray-800 dark:text-gray-200" />
          </button>
        </div>

        {/* PROFIL COMPACT */}
        <div className="flex flex-col items-center text-center py-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <img
            src={user?.avatar || "https://ui-avatars.com/api/?name=Admin"}
            alt="Profil"
            className="w-14 h-14 rounded-full object-cover shadow-sm mb-1 border-2 border-blue-600 dark:border-blue-500"
          />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {user?.full_name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user?.email}
          </p>
        </div>

        {/* MENU */}
        <nav className="mt-3 px-3 overflow-y-auto h-[calc(100vh-200px)]">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setSection(item.key);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-2.5 rounded-xl mb-2 text-sm font-medium transition-all duration-200
                  ${
                    active 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/50" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.02] bg-white dark:bg-gray-900" 
                  }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${active ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
