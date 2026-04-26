import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as api from '../lib/api';

const UINotificationsContext = createContext(null);

export function UINotificationsProvider({ children }) {
  const [items, setItems] = useState([]); // {id, title, message, type, time, unread}
  const [toasts, setToasts] = useState([]); // ephemeral {id, message, type}
  const idRef = useRef(0);

  const addNotification = (n) => {
    const id = ++idRef.current;
    const item = {
      id,
      title: n.title || 'Notification',
      message: n.message || '',
      type: n.type || 'info',
      time: new Date().toISOString(),
      unread: true,
      meta: n.meta || null,
    };
    setItems((prev) => [item, ...prev]);
    // also push toast
    setToasts((prev) => [...prev, { id, message: item.message || item.title, type: item.type }]);
    // auto-remove toast after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })));
    // Attempt to mark backend notifications read if meta contains original id
    try {
      const res = await api.getNotifications();
      if (res.ok && Array.isArray(res.data)) {
        const unreadIds = res.data.filter(n => !n.read).map(n => n.id);
        await Promise.all(unreadIds.map(id => api.markNotificationRead(id)));
      }
    } catch {}
  };
  const removeNotification = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  // Event bus: listen for global notifications
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      addNotification(detail);
    };
    window.addEventListener('notify', handler);
    return () => window.removeEventListener('notify', handler);
  }, []);

  const value = useMemo(
    () => ({ items, toasts, addNotification, markAllRead, removeNotification }),
    [items, toasts]
  );

  return (
    <UINotificationsContext.Provider value={value}>{children}</UINotificationsContext.Provider>
  );
}

export function useUINotifications() {
  const ctx = useContext(UINotificationsContext);
  if (!ctx) throw new Error('useUINotifications must be used within UINotificationsProvider');
  return ctx;
}
