'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('install-dismissed')) {
      setDismissed(true);
    }

    function handleBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }

    // Hide if already installed
    function handleAppInstalled() {
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem('install-dismissed', '1');
  }

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-14 left-2 right-2 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-3 safe-bottom">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">Install Axolocal</p>
        <p className="text-xs text-gray-500">Add to your home screen for quick access</p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
