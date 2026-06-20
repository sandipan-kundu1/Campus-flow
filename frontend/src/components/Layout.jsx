import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useNotifications } from "../context/NotificationContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Sparkles, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useState } from "react";

export default function Layout({ children }) {
  const { triggerDemo } = useNotifications();
  const location = useLocation();
  const isChat = location.pathname === "/chat";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Sidebar container */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 z-50 transition duration-200 ease-in-out md:flex`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full w-full">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 sm:px-6 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider hidden sm:block">
              Dashboard Panel
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <button
              onClick={triggerDemo}
              className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors shadow-lg shadow-accent-500/10"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">Generate Demo Alert</span>
              <span className="sm:hidden">Demo</span>
            </button>
            <div className="w-px h-6 bg-gray-800"></div>
            <NotificationBell />
          </div>
        </header>
        <main className={`flex-1 p-4 sm:p-6 flex flex-col min-h-0 ${isChat ? "overflow-hidden" : "overflow-y-auto"}`}>
          {isChat ? children : (
            <div className="w-full max-w-6xl mx-auto">
              {children}
            </div>
          )}
        </main>
      </div>
      <ToastContainer limit={5} />
    </div>
  );
}
