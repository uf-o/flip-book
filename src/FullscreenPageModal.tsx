import React, { useEffect, useRef, useState } from 'react';

export interface FullscreenPageModalProps {
  chapter: {
    id: string;
    title: string;
    vault: string;
    stress: number;
    offset: number;
    anchor: number;
    memory: number;
    pageCount: number;
    pages?: string[];
    isPdf?: boolean;
  };
  pageIndex: number;
  totalPages: number;
  onClose: () => void;
  onNavigate: (pageIndex: number) => void;
  renderPage: (pageIndex: number) => React.ReactNode;
}

export const FullscreenPageModal: React.FC<FullscreenPageModalProps> = ({
  chapter,
  pageIndex,
  totalPages,
  onClose,
  onNavigate,
  renderPage,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(
    typeof document !== 'undefined' && !!document.fullscreenElement
  );
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset pan when page changes
  useEffect(() => {
    setPanPosition({ x: 0, y: 0 });
  }, [pageIndex]);

  // Monitor native fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation & zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (pageIndex < totalPages - 1) onNavigate(pageIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (pageIndex > 0) onNavigate(pageIndex - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((z) => Math.max(0.75, Math.round((z - 0.25) * 100) / 100));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPanPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageIndex, totalPages, onClose, onNavigate]);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Native fullscreen toggle failed (iframe permissions):', err);
    }
  };

  // Pan dragging when zoomed
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPanX: panPosition.x,
        initialPanY: panPosition.y,
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && zoom > 1) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanPosition({
        x: panStartRef.current.initialPanX + dx,
        y: panStartRef.current.initialPanY + dy,
      });
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom((z) => Math.min(3, Math.max(0.75, Math.round((z + delta) * 100) / 100)));
    }
  };

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;
  const isPdf = !!chapter.pages && !!chapter.pages[pageIndex];

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0E0C0A]/95 backdrop-blur-md flex flex-col text-[var(--text)] select-none animate-fade-in font-mono overflow-hidden"
      style={{ boxSizing: 'border-box' }}
      onWheel={handleWheel}
    >
      {/* Top brutalist bar */}
      <div className="h-[46px] border-b border-[var(--border)] bg-[var(--bg-card)] px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[9px] tracking-widest font-bold hover:bg-[var(--text)] hover:text-[var(--bg)] cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
            title="Quitter le mode plein écran (Échap)"
          >
            <span>✕</span>
            <span className="hidden sm:inline">FERMER // ESC</span>
          </button>

          <div className="flex items-center gap-2 truncate text-[10px] tracking-widest font-bold">
            <span className="border border-[var(--border-soft)] px-1.5 py-0.5 text-[8px] bg-[var(--bg)] hidden md:inline">
              {chapter.vault}
            </span>
            <span className="truncate uppercase">{chapter.title}</span>
          </div>

          <div className="border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] px-2 py-0.5 text-[9px] font-bold tracking-widest shrink-0">
            PAGE {String(pageIndex + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
          </div>

          {isPdf ? (
            <span className="bg-[var(--accent)] text-white text-[7px] px-1.5 py-0.5 font-bold tracking-wider hidden sm:inline">
              PDF ULTRA HD
            </span>
          ) : (
            <span className="border border-[var(--border-soft)] text-[7px] px-1.5 py-0.5 tracking-wider hidden sm:inline opacity-70">
              PROCÉDURAL
            </span>
          )}
        </div>

        {/* Center / Right controls: Zoom & Native Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center border border-[var(--border)] bg-[var(--bg)] p-0.5">
            <button
              type="button"
              disabled={zoom <= 0.75}
              onClick={() => setZoom((z) => Math.max(0.75, Math.round((z - 0.25) * 100) / 100))}
              className="px-2 py-0.5 text-[10px] font-bold hover:bg-[var(--text)] hover:text-[var(--bg)] disabled:opacity-30 cursor-pointer"
              title="Zoom arrière (-)"
            >
              −
            </button>
            <span className="px-1.5 text-[8px] font-bold tracking-wider min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              disabled={zoom >= 3}
              onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
              className="px-2 py-0.5 text-[10px] font-bold hover:bg-[var(--text)] hover:text-[var(--bg)] disabled:opacity-30 cursor-pointer"
              title="Zoom avant (+)"
            >
              +
            </button>
            {zoom !== 1 && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="border-l border-[var(--border-soft)] px-1.5 py-0.5 text-[7px] hover:bg-[var(--text)] hover:text-[var(--bg)] cursor-pointer"
                title="Réinitialiser zoom (0)"
              >
                1:1
              </button>
            )}
          </div>

          {/* Browser fullscreen toggle */}
          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className="border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[8px] tracking-wider hover:bg-[var(--text)] hover:text-[var(--bg)] transition-colors cursor-pointer hidden md:flex items-center gap-1"
            title="Basculer plein écran du navigateur"
          >
            <span>⛶</span>
            <span>{isNativeFullscreen ? 'FENÊTRE' : 'MONITEUR'}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div
        ref={viewportRef}
        className="flex-1 w-full min-h-0 relative overflow-hidden flex items-center justify-center p-2 sm:p-6"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
      >
        {/* Background diagnostic pattern */}
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

        {/* Floating previous page button */}
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onNavigate(pageIndex - 1)}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] px-2.5 sm:px-3 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold tracking-widest shadow-2xl disabled:opacity-20 hover:enabled:bg-[var(--text)] hover:enabled:text-[var(--bg)] transition-all cursor-pointer flex flex-col items-center gap-1 group active:scale-95"
          title="Page précédente (Flèche gauche)"
        >
          <span className="text-[14px] leading-none group-hover:-translate-x-0.5 transition-transform">◀</span>
          <span className="text-[7px] opacity-70">P{String(pageIndex).padStart(2, '0')}</span>
        </button>

        {/* Floating next page button */}
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onNavigate(pageIndex + 1)}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] px-2.5 sm:px-3 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold tracking-widest shadow-2xl disabled:opacity-20 hover:enabled:bg-[var(--text)] hover:enabled:text-[var(--bg)] transition-all cursor-pointer flex flex-col items-center gap-1 group active:scale-95"
          title="Page suivante (Flèche droite ou Espace)"
        >
          <span className="text-[14px] leading-none group-hover:translate-x-0.5 transition-transform">▶</span>
          <span className="text-[7px] opacity-70">P{String(pageIndex + 2).padStart(2, '0')}</span>
        </button>

        {/* Page Container with Zoom & Pan transform */}
        <div
          className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {isPdf ? (
            <div className="relative shadow-[0_25px_80px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--paper)] max-h-[82vh] max-w-[85vw] flex items-center justify-center p-1 sm:p-2">
              <img
                src={chapter.pages![pageIndex]}
                alt={`Page ${pageIndex + 1}`}
                className="max-h-[78vh] max-w-[82vw] object-contain drop-shadow select-none pointer-events-none"
              />
              <div className="absolute top-2 right-2 bg-[var(--accent)] text-white text-[7px] font-bold px-1.5 py-0.5 shadow">
                P{String(pageIndex + 1).padStart(2, '0')}
              </div>
            </div>
          ) : (
            <div className="w-[840px] max-w-[88vw] aspect-[1/1.36] shadow-[0_25px_80px_rgba(0,0,0,0.5)] border border-[var(--border)] bg-[var(--paper)] overflow-hidden flex flex-col">
              {renderPage(pageIndex)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Quick page scrubber and shortcuts */}
      <div className="border-t border-[var(--border)] bg-[var(--hud-bg)] text-[var(--hud-text)] px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-[8px] tracking-[0.16em] z-20">
        <div className="flex items-center gap-3">
          <span className="font-bold hidden sm:inline">PLEIN ÉCRAN ACTIF</span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-[60vw] py-0.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate(i)}
                className={`w-[22px] h-[20px] text-[7px] font-bold border flex items-center justify-center transition-all cursor-pointer ${
                  i === pageIndex
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] scale-110 shadow'
                    : 'border-[var(--hud-text)]/30 text-[var(--hud-text)] hover:bg-[var(--hud-text)]/20'
                }`}
                title={`Aller à la page ${i + 1}`}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-[7px] opacity-75">
          <span>CLAVIER: ← / → PAGES</span>
          <span>•</span>
          <span>+/- ZOOM</span>
          <span>•</span>
          <span>0 RÉINITIALISER</span>
          <span>•</span>
          <span>ÉCHAP QUITTER</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="opacity-60 hidden md:inline">STRESS: {chapter.stress}%</span>
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--hud-text)]/40 px-2.5 py-1 text-[8px] hover:bg-[var(--hud-text)] hover:text-[var(--hud-bg)] transition-colors cursor-pointer"
          >
            QUITTER ✕
          </button>
        </div>
      </div>
    </div>
  );
};
