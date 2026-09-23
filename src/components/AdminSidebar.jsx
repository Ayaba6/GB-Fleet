import React from "react";
import { 
  LogOut, X, GaugeCircle, Users, Truck, ClipboardList, 
  AlertTriangle, FileWarning, CreditCard, Settings, Circle
} from "lucide-react";

const MENU_ITEMS = [
  { key: "dashboard", label: "Tableau de Bord", icon: GaugeCircle },
  { key: "users", label: "Utilisateurs", icon: Users },
  { key: "camions", label: "Flotte", icon: Truck },
  { key: "pneus", label: "Pneus", icon: Circle },
  { key: "missions", label: "Missions", icon: ClipboardList },
  { key: "pannes", label: "Pannes", icon: AlertTriangle },
  { key: "maintenance", label: "Maintenance", icon: Settings },
  { key: "documents", label: "Documents", icon: FileWarning },
  { key: "billing", label: "Facturation", icon: CreditCard },
];

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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs md:hidden z-40 transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 shadow-xl z-50 flex flex-col justify-between transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* TOP SECTION: HEADER & PROFIL */}
        <div>
          {/* PROFIL COMPACT (Nom, Prénom et Email affichés l'un sous l'autre) */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'Admin')}&background=2563eb&color=fff`}
                alt="Profil"
                className="w-12 h-12 rounded-xl object-cover shadow-sm border-2 border-blue-600 flex-shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.full_name || user?.prenom && user?.nom ? `${user.prenom} ${user.nom}` : "Administrateur"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || "admin@gbfleet.com"}
                </p>
              </div>
            </div>

            {/* Bouton fermer mobile uniquement */}
            <button
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors md:hidden flex-shrink-0 ml-1"
              onClick={() => setMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MENU NAVIGATION */}
          <nav className="mt-4 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (typeof setSection === "function") {
                      setSection(item.key);
                    } else {
                      console.error("setSection n'est pas une fonction ! Vérifiez vos props dans App.jsx");
                    }
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/25"
                      : "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${active ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SECTION: DECONNEXION */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}