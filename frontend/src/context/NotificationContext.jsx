import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getAlerts, markAlertAsRead, markAllAlertsAsRead, generateDemoAlert, generateAlerts } from "../api/client";
import { toast } from "react-toastify";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const knownIds = useRef(new Set());
  const isInitialLoad = useRef(true);

  // Request native browser notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "default") {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  };

  useEffect(() => {
    requestPermission();
  }, []);

  // Show native desktop notification
  const triggerBrowserNotification = (title, message) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico"
      });
    } catch (err) {
      console.error("Browser notification failed:", err);
    }
  };

  // Trigger both React Toast and Browser notification
  const triggerAlert = (alert) => {
    // Show Toast popup (auto-close after 8 seconds, top-right)
    toast.info(
      <div className="flex flex-col gap-1">
        <span className="font-bold text-sm text-white">{alert.title}</span>
        <span className="text-xs text-gray-300">{alert.message}</span>
      </div>,
      {
        position: "top-right",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
      }
    );

    // Show Native Browser Notification
    triggerBrowserNotification(alert.title, alert.message);
  };

  // Fetch all alerts
  const fetchNotifications = async () => {
    try {
      // Proactively trigger generator so db is up to date
      await generateAlerts();
      
      const res = await getAlerts();
      const alerts = res.data || [];
      
      setNotifications(alerts);
      setUnreadCount(alerts.filter(a => !a.read).length);

      // Check for new unread alerts
      let newAlertsFound = false;
      
      alerts.forEach(alert => {
        if (!knownIds.current.has(alert.id)) {
          knownIds.current.add(alert.id);
          // If not the very first page load and it's unread, trigger alerts
          if (!isInitialLoad.current && !alert.read) {
            triggerAlert(alert);
            newAlertsFound = true;
          }
        }
      });

      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Poll notifications every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Mark a single notification as read
  const markAsRead = async (id) => {
    try {
      await markAlertAsRead(id);
      setNotifications(prev => 
        prev.map(a => a.id === id ? { ...a, read: true } : a)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking alert as read:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await markAllAlertsAsRead();
      setNotifications(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all alerts as read:", err);
    }
  };

  // Trigger Demo Alert
  const triggerDemo = async () => {
    try {
      const res = await generateDemoAlert();
      const demoAlert = res.data;
      
      // Ensure we track this ID so we don't trigger it again in polling
      knownIds.current.add(demoAlert.id);
      
      // Add immediately to the local state
      setNotifications(prev => [demoAlert, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Instantly trigger toast + browser notification
      triggerAlert(demoAlert);
    } catch (err) {
      console.error("Error triggering demo alert:", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        triggerDemo,
        requestPermission
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
