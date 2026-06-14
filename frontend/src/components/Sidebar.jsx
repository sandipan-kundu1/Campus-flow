import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  ClipboardList,
  MessageSquare,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/deadlines", label: "Deadlines", icon: ClipboardList },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 h-full bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800 shrink-0">
        <GraduationCap className="text-accent-500" size={28} />
        <span className="text-xl font-bold text-white">
          Campus<span className="text-accent-500">Flow</span>
        </span>
      </div>
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="px-4 py-3 border-t border-gray-800 flex flex-col gap-2 bg-gray-950/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-gray-700 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-xs shrink-0">
                {user.name?.charAt(0).toUpperCase() || "S"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium transition-colors"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      )}
      <div className="px-5 py-3 border-t border-gray-800 text-[10px] text-gray-600 shrink-0">
        Campus Flow v1.0 · MVP
      </div>
    </aside>
  );
}
