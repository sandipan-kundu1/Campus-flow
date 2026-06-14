import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useNotifications } from "../context/NotificationContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Sparkles } from "lucide-react";

export default function Layout({ children }) {
  const { triggerDemo } = useNotifications();

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="text-gray-400 text-xs font-medium uppercase tracking-wider hidden sm:block">
            Dashboard Panel
          </div>
          <div className="flex items-center gap-4 ml-auto sm:ml-0">
            <button
              onClick={triggerDemo}
              className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-accent-500/10"
            >
              <Sparkles size={13} />
              Generate Demo Alert
            </button>
            <div className="w-px h-6 bg-gray-800"></div>
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <ToastContainer limit={5} />
    </div>
  );
}
