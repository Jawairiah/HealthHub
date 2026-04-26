import { createContext, useContext, useMemo, useState } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'info', message: 'Welcome to Medicare!', read: false },
  ]);

  const addNotification = (payload) => {
    setNotifications((prev) => [
      { id: Date.now(), read: false, ...payload },
      ...prev,
    ]);
  };

  const markRead = (id) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => setNotifications([]);

  const value = useMemo(() => ({ notifications, addNotification, markRead, clearAll }), [notifications]);
  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}