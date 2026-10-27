import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] px-2.5 py-[2px] text-[9px] tracking-[0.18em] font-bold hover:opacity-85 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
        title="Install Flip Book Vault app for offline reading"
      >
        <span>INSTALL // ⇪</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="border border-[var(--border)] px-2 py-[2px] text-[9px] tracking-widest hover:bg-[var(--text)] hover:text-[var(--bg)] transition-colors cursor-pointer"
          title="Install on iOS"
        >
          INSTALL // iOS ⇪
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-2xl">
              <div className="flex justify-between items-center mb-3 border-b border-[var(--border-soft)] pb-2">
                <h3 className="text-[11px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase">
                  INSTALL ON IPHONE / IPAD
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="border border-[var(--border)] px-2 py-0.5 text-[8px]"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-[var(--text)] opacity-90 mb-4 font-mono">
                1. Tap the <strong className="text-[var(--accent)]">Share</strong> button in Safari toolbar (□ with ↑).<br />
                2. Scroll down and tap <strong className="text-[var(--accent)]">Add to Home Screen</strong>.<br />
                3. Launch from your home screen for full offline reading and PDF support.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] py-2 text-[10px] tracking-widest font-bold hover:opacity-80 cursor-pointer"
              >
                CLOSE // PROCEED
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
