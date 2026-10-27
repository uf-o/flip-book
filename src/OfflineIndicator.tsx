import React from 'react';
import { useOnlineStatus } from './useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[85] flex items-center gap-2 border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] px-3 py-1.5 text-[8px] tracking-[0.18em] shadow-xl uppercase animate-fade-in font-mono">
      <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
      <span>OFFLINE MODE ACTIVE // CELL MEMORY CACHED • PDF RENDERING AVAILABLE</span>
    </div>
  );
};
