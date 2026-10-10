import React, { useState, useEffect } from 'react';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isIos && !isStandalone) {
      setShowIosTip(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  if (deferredPrompt) {
    return (
      <div className="w-full bg-primary text-on-primary p-3 rounded-2xl flex items-center justify-between gap-3 shadow-[0_3px_0_0_#4500D8] mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl">📱</span>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-xs font-bold truncate">Install Goalstreet PWA</span>
            <span className="text-[11px] text-primary-fixed opacity-90 truncate">Fast standalone matchday access</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1 bg-surface text-primary rounded-xl font-headline-sm text-xs font-bold shadow-sm"
          >
            Install
          </button>
          <button onClick={() => setDismissed(true)} className="text-on-primary/70 hover:text-on-primary p-1">
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (showIosTip) {
    return (
      <div className="w-full bg-surface-container-high border border-outline-variant/60 p-3 rounded-2xl flex items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">📲</span>
          <div className="flex flex-col">
            <span className="font-bold text-on-surface">Install on iPhone:</span>
            <span className="text-on-surface-variant text-[11px]">Tap Share 📤 then choose "Add to Home Screen" ➕</span>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-on-surface-variant p-1 text-xs">
          ✕
        </button>
      </div>
    );
  }

  return null;
};
