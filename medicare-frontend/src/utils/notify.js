export function initNotifyGlobal(){
  if (typeof window !== 'undefined' && !window.notify){
    window.notify = (detail) => {
      try { window.dispatchEvent(new CustomEvent('notify', { detail })); } catch {}
    };
  }
}