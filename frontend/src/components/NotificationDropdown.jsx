import { useNotifications } from "../context/NotificationContext";
import { BookOpen, CalendarDays, ClipboardList, AlertCircle, Check, CheckSquare } from "lucide-react";

export default function NotificationDropdown({ onClose }) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const getAlertIcon = (type) => {
    switch (type) {
      case "class":
        return <BookOpen size={16} className="text-blue-400" />;
      case "event":
        return <CalendarDays size={16} className="text-orange-400" />;
      case "assignment":
      case "project":
        return <ClipboardList size={16} className="text-purple-400" />;
      case "exam":
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <BookOpen size={16} className="text-gray-400" />;
    }
  };

  const getAlertColor = (type, read) => {
    if (read) return "border-gray-800 bg-gray-900/40 opacity-75";
    switch (type) {
      case "class":
        return "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10";
      case "event":
        return "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10";
      case "assignment":
      case "project":
        return "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10";
      case "exam":
        return "border-red-500/20 bg-red-500/5 hover:bg-red-500/10";
      default:
        return "border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/60";
    }
  };

  const formatTimeAgo = (dateStr) => {
    try {
      const diffMs = new Date() - new Date(dateStr);
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-96 rounded-xl border border-gray-800 bg-gray-900/95 shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/60">
        <span className="font-semibold text-sm text-white">Notifications</span>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            <CheckSquare size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/50 scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Check className="mb-2 text-gray-600" size={24} />
            <p className="text-xs">No notifications yet</p>
          </div>
        ) : (
          notifications.map((alert) => (
            <div
              key={alert.id}
              onClick={() => !alert.read && markAsRead(alert.id)}
              className={`flex gap-3 p-4 border-l-2 text-left cursor-pointer transition-all ${getAlertColor(
                alert.type,
                alert.read
              )}`}
            >
              <div className="mt-0.5 shrink-0 bg-gray-950/50 p-1.5 rounded-lg border border-gray-800/80">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-white truncate pr-2">
                    {alert.title}
                  </span>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">
                    {formatTimeAgo(alert.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed line-clamp-2">
                  {alert.message}
                </p>
                {!alert.read && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-primary-400 font-medium hover:underline">
                    <Check size={10} /> Mark read
                  </div>
                )}
              </div>
              {!alert.read && (
                <div className="mt-1.5 shrink-0">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full shadow-glow"></div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-950/40 border-t border-gray-800 text-center">
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
