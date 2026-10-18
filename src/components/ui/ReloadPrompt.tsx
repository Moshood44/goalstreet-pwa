import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodic check for SW updates
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm bg-surface-container-lowest border-2 border-primary/20 rounded-2xl p-4 shadow-[0_8px_24px_rgba(30,27,46,0.15)] flex items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">🚀</span>
        <div className="flex flex-col">
          <span className="font-headline-sm text-xs text-on-surface font-bold">
            New version available
          </span>
          <span className="text-[11px] text-on-surface-variant">
            Update to get the latest matchday data
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-sm active:scale-95"
        >
          Refresh
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-2 py-1.5 text-on-surface-variant text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
