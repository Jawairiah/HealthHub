import React from 'react';
import { useUINotifications } from '../context/UINotifications.jsx';

export default function NotificationToast() {
  const { toasts } = useUINotifications();
  if (!toasts || toasts.length === 0) return null;
  return (
    <div style={{position:'fixed', right:20, bottom:20, display:'grid', gap:8, zIndex: 50}}>
      {toasts.map((t) => (
        <div key={t.id} className="card" style={{minWidth:280, borderLeft:'4px solid', borderLeftColor: colorForType(t.type)}}>
          <div style={{fontWeight:600}}>{labelForType(t.type)} </div>
          <div className="subtitle">{t.message}</div>
        </div>
      ))}
    </div>
  );
}

function colorForType(type){
  switch(type){
    case 'success': return '#22c55e';
    case 'error': return '#ef4444';
    case 'warn': return '#f59e0b';
    default: return '#14b8a6';
  }
}
function labelForType(type){
  switch(type){
    case 'success': return 'Success';
    case 'error': return 'Error';
    case 'warn': return 'Warning';
    default: return 'Notification';
  }
}