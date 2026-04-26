import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const { notifications, markRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;
  const panelRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <div className="bell" onClick={() => setOpen(v => !v)} aria-label="Notifications" role="button">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2z" />
          <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" />
        </svg>
        {unread > 0 && <span className="dot" />}
      </div>
      {open && (
        <div ref={panelRef} className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Notifications</strong>
            <button className="btn" onClick={clearAll}>Clear</button>
          </div>
          <div className="stack">
            {notifications.length === 0 && (
              <div className="notif">No notifications</div>
            )}
            {notifications.map(n => (
              <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{n.message}</span>
                  {!n.read && (
                    <button className="btn success" onClick={() => markRead(n.id)}>Mark read</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}