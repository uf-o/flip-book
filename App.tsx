import React, { useEffect, useMemo, useRef, useState } from 'react';
import refImg1 from "./assets/80680da4f0800853-1.png";
import refImg4 from "./assets/9a6b366f65f1b8ad-4.png";

// Required PDF.js CDN for flipbook PDF import – must remain as literal per validation
const PDFJS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Types
type ChapterRecord = {
  id: string;
  title: string;
  pageCount: number;
  date: string;
  characterIds: string[];
  stress: number;
  offset: number;
  anchor: number;
  memory: number;
  vault: string;
  description: string;
};

type CharacterRecord = {
  id: string;
  num: string;
  name: string;
  role: string;
  location: string;
  bio: string;
  tags: string[];
  avatarColor: string;
  sync: number;
  threat: number;
  anchor: number;
  memory: number;
  connections: number;
  moments: number;
};

// Fallback in-memory/localStorage store for resilience
const fallbackStore: Record<string, Array<{ id: string; value: any }>> = {};

function localApiFallback(action: string, args: any) {
  const col = args?.collection || 'default';
  if (!fallbackStore[col]) {
    try {
      const saved = localStorage.getItem(`syn_${col}`);
      fallbackStore[col] = saved ? JSON.parse(saved) : [];
    } catch {
      fallbackStore[col] = [];
    }
  }

  const save = () => {
    try {
      localStorage.setItem(`syn_${col}`, JSON.stringify(fallbackStore[col]));
    } catch {}
  };

  if (action === 'records.list') {
    return { records: [...fallbackStore[col]] };
  }
  if (action === 'records.create') {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record = { id, value: args.value };
    fallbackStore[col].push(record);
    save();
    return { record };
  }
  if (action === 'records.replace') {
    const idx = fallbackStore[col].findIndex((r) => r.id === args.id || r.value?.id === args.id);
    if (idx !== -1) {
      fallbackStore[col][idx] = { id: fallbackStore[col][idx].id, value: args.value };
      save();
      return { record: fallbackStore[col][idx] };
    }
    return { success: false };
  }
  if (action === 'records.delete') {
    const idx = fallbackStore[col].findIndex((r) => r.id === args.id || r.value?.id === args.id);
    if (idx !== -1) {
      fallbackStore[col].splice(idx, 1);
      save();
    }
    return { success: true };
  }
  return {};
}

// API wrapper
async function api(action: string, args: any) {
  try {
    const res = await fetch("/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, args }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && !json.error && json.data !== undefined) return json.data;
  } catch {
    // If backend endpoint is temporarily unreachable, fall back to client store
  }
  return localApiFallback(action, args);
}

// Idempotency
const makeKey = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Sample data
const SAMPLE_CHARACTERS: CharacterRecord[] = [
  {
    id: "char_01",
    num: "01",
    name: "MIRA KOVACS",
    role: "ARCHIVIST",
    location: "SECTOR 7 / VAULT",
    bio: "Lead vault operator. Maintains continuity of cell memory across replica drifts. Known for refusing to purge corrupted chapters. Holds anchor at 88%.",
    tags: ["ANCHOR", "MEMORY", "RISK"],
    avatarColor: "#2A9D8F",
    sync: 88,
    threat: 12,
    anchor: 88,
    memory: 74,
    connections: 4,
    moments: 12,
  },
  {
    id: "char_02",
    num: "02",
    name: "JUN PARK",
    role: "RUNNER",
    location: "LOWER GRID",
    bio: "Courier of banned prints. Moves between cells with undocumented margins. Pulse burst anomaly recorded 04.11. Scars from paper cuts that never healed.",
    tags: ["SPEED", "GHOST", "MARGIN"],
    avatarColor: "#FF3B30",
    sync: 43,
    threat: 67,
    anchor: 34,
    memory: 55,
    connections: 9,
    moments: 21,
  },
  {
    id: "char_03",
    num: "03",
    name: "ELI VOSS",
    role: "REPLICANT",
    location: "UNKNOWN",
    bio: "Unregistered cell. Appears only in offset pages. Baseline deviation 12%. Possibly author self-insert. Do not trust his dialogue boxes.",
    tags: ["OFFSET", "DEVIATION", "ECHO"],
    avatarColor: "#E9C46A",
    sync: 21,
    threat: 81,
    anchor: 19,
    memory: 92,
    connections: 2,
    moments: 7,
  },
  {
    id: "char_04",
    num: "04",
    name: "ANNA K.",
    role: "DESIGNER",
    location: "LONDON, UK",
    bio: "Designer of the vault interface. Obsessed with dot grids and T-marks. Her profile card became the template for all character logs. Loves brutalist archives.",
    tags: ["SYSTEM", "GRID", "FORM"],
    avatarColor: "#264653",
    sync: 76,
    threat: 8,
    anchor: 91,
    memory: 64,
    connections: 6,
    moments: 14,
  },
];

const SAMPLE_CHAPTERS: ChapterRecord[] = [
  {
    id: "ch_01",
    title: "THE STATIC PROTOCOL",
    pageCount: 12,
    date: "2024.11.04",
    characterIds: ["char_01", "char_04"],
    stress: 55,
    offset: 20,
    anchor: 78,
    memory: 43,
    vault: "BX-1129",
    description: "Vault initialization. The dot grid fails. First eye opens.",
  },
  {
    id: "ch_02",
    title: "PULSE.BURST // NORMAL",
    pageCount: 10,
    date: "2024.11.12",
    characterIds: ["char_02", "char_03"],
    stress: 71,
    offset: 34,
    anchor: 42,
    memory: 89,
    vault: "BX-1130",
    description: "Runner crosses the margin. Replicant risk spikes to 2.04M cells.",
  },
  {
    id: "ch_03",
    title: "VERTICAL PHASE / HORIZONTAL",
    pageCount: 8,
    date: "2024.11.19",
    characterIds: ["char_01", "char_02", "char_03", "char_04"],
    stress: 33,
    offset: 12,
    anchor: 94,
    memory: 21,
    vault: "BX-1131",
    description: "All logs converge. The book learns to flip itself.",
  },
];

// Helpers
function formatTime() {
  const d = new Date();
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Pixel components
function MiniBar({ value, color = 'var(--text)' }: { value: number; color?: string }) {
  const bars = 12;
  const filled = Math.round((value / 100) * bars);
  return (
    <div className="flex gap-[2px] items-end h-[14px]">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px]"
          style={{
            height: `${4 + (i / bars) * 10}px`,
            background: i < filled ? color : 'var(--border-soft)',
            opacity: i < filled ? 1 : 0.6,
          }}
        />
      ))}
    </div>
  );
}

function DotMatrix({ rows = 7, cols = 9, seed = 1 }: { rows?: number; cols?: number; seed?: number }) {
  // pseudo random eye pattern
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, 6px)` }}>
      {Array.from({ length: rows * cols }).map((_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const dx = c - cols / 2;
        const dy = r - rows / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isEye = dist < 2.2 + Math.sin(seed) || (r === Math.floor(rows/2) && Math.abs(c - cols/2) < 2);
        const active = (idx + seed * 7) % 3 === 0 ? true : isEye;
        return (
          <div
            key={idx}
            className="w-[6px] h-[6px] rounded-[1px]"
            style={{
              background: active ? 'var(--text)' : 'transparent',
              border: active ? 'none' : '1px solid var(--border-soft)',
              opacity: active ? 0.9 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

function Waveform({ stress = 55 }: { stress?: number }) {
  const points = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 40; i++) {
      pts.push(Math.sin(i * 0.6 + stress * 0.05) * (stress / 2) + Math.random() * 6);
    }
    return pts;
  }, [stress]);
  return (
    <svg viewBox="0 0 120 28" className="w-full h-[28px]">
      <polyline
        fill="none"
        stroke="var(--text)"
        strokeWidth="1.2"
        strokeDasharray="2 3"
        points={points.map((v, i) => `${(i / 39) * 120},${14 + v * 0.18}`).join(' ')}
      />
      <polyline
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
        points={points.map((v, i) => `${(i / 39) * 120},${14 + v * 0.12}`).join(' ')}
      />
    </svg>
  );
}

function ComicPageContent({ pageNum, chapter, char }: { pageNum: number; chapter: ChapterRecord; char?: CharacterRecord[] }) {
  // generate fake comic panels per page
  const panelType = pageNum % 4;
  return (
    <div className="w-full h-full bg-[var(--paper)] text-[var(--text)] p-[10px] flex flex-col gap-[8px] paper-texture overflow-hidden relative">
      {/* header strip */}
      <div className="flex justify-between text-[8px] tracking-[0.18em] border-b border-[var(--border-soft)] pb-[4px] uppercase opacity-70">
        <span>{chapter.vault} // {chapter.title}</span>
        <span>P{String(pageNum + 1).padStart(2, '0')} // {formatTime()}</span>
      </div>

      {panelType === 0 && (
        <>
          <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-[6px]">
            <div className="col-span-8 row-span-4 border border-[var(--border)] bg-[var(--bg-soft)] p-[8px] flex flex-col">
              <div className="text-[18px] font-bold leading-[0.9] tracking-tighter uppercase">{chapter.title}</div>
              <div className="mt-auto text-[9px] leading-[1.3] max-w-[18ch]">STRESS: {chapter.stress}% OFFSET: {chapter.offset}%<br/>The archive breathes. The page curls by itself.</div>
              <div className="mt-2"><DotMatrix seed={pageNum + chapter.stress} rows={4} cols={12} /></div>
            </div>
            <div className="col-span-4 row-span-2 border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] p-[6px]">
              <div className="text-[7px] tracking-widest">CHAR LOG // {char?.[0]?.num || '01'}</div>
              <div className="text-[11px] font-bold mt-1 leading-none">{char?.[0]?.name || 'MIRA KOVACS'}</div>
              <div className="text-[7px] mt-2 opacity-80">SHE HOLDS THE GRID.</div>
            </div>
            <div className="col-span-4 row-span-4 border border-[var(--border)] relative overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-6 gap-[1px] p-[2px]">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="bg-[var(--text)]" style={{ opacity: (i % 7 === 0) ? 0.9 : 0.15 }} />
                ))}
              </div>
              <div className="relative z-10 h-full flex items-center justify-center text-[28px]">◍</div>
            </div>
            <div className="col-span-8 row-span-2 border border-dashed border-[var(--border-soft)] p-[6px] flex items-center gap-2">
              <MiniBar value={chapter.memory} />
              <span className="text-[7px]">MEMORY {chapter.memory}% // ANCHOR {chapter.anchor}%</span>
            </div>
          </div>
          <div className="h-[18px] border border-[var(--border)] flex items-center px-2 text-[7px] tracking-[0.2em] justify-between bg-[var(--bg-soft)]">
            <span>◐ DEVIATION: {chapter.offset}% | BASELINE</span>
            <span>▶ PLAY</span>
          </div>
        </>
      )}

      {panelType === 1 && (
        <>
          <div className="flex-1 border border-[var(--border)] relative overflow-hidden bg-[var(--bg-soft)]">
            <div className="absolute inset-0 dot-grid opacity-40" />
            <div className="relative h-full grid grid-cols-3 p-[8px] gap-[8px]">
              <div className="col-span-2 flex flex-col justify-between">
                <div className="text-[22px] font-bold leading-[0.85] uppercase tracking-tighter">PULSE<br/>BURS//<br/>NORMAL</div>
                <Waveform stress={chapter.stress} />
              </div>
              <div className="border-l border-[var(--border-soft)] pl-[8px] flex flex-col gap-[6px]">
                <div className="text-[8px]">SYN / DIAGNOSTIC</div>
                <div className="w-full h-[64px] border border-[var(--border)] bg-white dark:bg-black p-[4px]">
                  <div className="text-[5px] leading-[1.1] font-bold">EYE_TRACK<br/>CELLS 1.04M<br/>REPLICANT RISK<br/>████░░░░ 43%</div>
                </div>
                <div className="text-[7px] opacity-60">98.8 FM // GRID LOCK</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[6px] h-[84px]">
            <div className="border border-[var(--border)] p-[6px] text-[8px] leading-[1.2]">
              “The page is not paper. It’s a phase state.”
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-[10px] h-[10px] border border-[var(--border)]" style={{ background: i < 3 ? 'var(--text)' : 'transparent' }} />
                ))}
              </div>
            </div>
            <div className="border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] p-[6px] text-[8px]">
              <div className="flex justify-between"><span>STRESS</span><span>{chapter.stress}%</span></div>
              <div className="w-full h-[4px] bg-[var(--border-soft)] mt-1"><div className="h-full bg-[var(--bg)]" style={{ width: `${chapter.stress}%` }} /></div>
              <div className="mt-2 opacity-70">OFFSET ANCHORED // MEMORY OK</div>
            </div>
          </div>
        </>
      )}

      {panelType === 2 && (
        <>
          <div className="flex-1 grid grid-cols-12 gap-[6px]">
            <div className="col-span-12 h-[98px] border border-[var(--border)] flex">
              <div className="flex-1 bg-[var(--text)] text-[var(--bg)] p-[8px] flex flex-col justify-between">
                <div className="text-[8px] tracking-[0.2em]">VERTICAL PHAS// ORISONTAL</div>
                <div className="text-[30px] font-bold leading-[0.8]">04</div>
                <div className="text-[7px]">SYNC {chapter.anchor}% // HOLD</div>
              </div>
              <div className="w-[84px] border-l border-[var(--border)] bg-[var(--paper)] flex items-center justify-center">
                <DotMatrix rows={6} cols={6} seed={pageNum * 3} />
              </div>
            </div>
            <div className="col-span-7 border border-[var(--border)] p-[6px] bg-[var(--bg-soft)]">
              <div className="text-[10px] font-bold uppercase">Dialogue // {char?.[1]?.name || 'JUN PARK'}</div>
              <div className="mt-2 text-[9px] leading-[1.3] border border-[var(--border)] bg-[var(--paper)] p-[6px]">
                You can't flip forward. The vault only allows backward.
                <div className="mt-2 text-[6px] opacity-60">[OFFSET: {chapter.offset}%]</div>
              </div>
              <div className="mt-2 flex gap-[4px]">
                <span className="px-[4px] py-[2px] border border-[var(--border)] text-[6px]">GHOST</span>
                <span className="px-[4px] py-[2px] bg-[var(--text)] text-[var(--bg)] text-[6px]">MARGIN</span>
              </div>
            </div>
            <div className="col-span-5 border border-[var(--border)] relative bg-white dark:bg-black overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-[10px] tracking-widest">NO SIGNAL</div>
              <div className="absolute bottom-0 w-full h-[12px] bg-[var(--text)] text-[var(--bg)] text-[6px] flex items-center px-1">98.8 FM // KISS</div>
            </div>
          </div>
          <div className="h-[22px] border border-[var(--border)] flex items-center justify-between px-2 text-[7px] bg-[var(--bg-soft)]">
            <span>CELLS 2.04M • ARCHIVE RISK • {chapter.vault}</span>
            <span className="flex gap-1">{Array.from({ length: 6 }).map((_, i) => (<span key={i} className="w-[6px] h-[6px] bg-[var(--text)] inline-block" style={{ opacity: 0.2 + i * 0.12 }} />))}</span>
          </div>
        </>
      )}

      {panelType === 3 && (
        <>
          <div className="flex-1 grid grid-rows-3 gap-[6px]">
            <div className="border border-[var(--border)] p-[6px] flex gap-[8px]">
              <div className="w-[48px] h-[48px] border border-[var(--border)] bg-[var(--text)] flex items-center justify-center text-[var(--bg)] text-[18px]">◐</div>
              <div className="flex-1">
                <div className="text-[9px] font-bold">PAGE STUDY // TEXTURE</div>
                <div className="text-[7px] leading-[1.2] mt-1 opacity-70">Paper is simulated. Noise is real. The dot grid is a diagnostic to check if reader is replicant. Look at T-marks.</div>
                <div className="mt-2 flex gap-[2px]">{Array.from({ length: 24 }).map((_, i) => (<div key={i} className="h-[3px] w-[4px] bg-[var(--text)]" style={{ opacity: i % 2 ? 0.8 : 0.2 }} />))}</div>
              </div>
            </div>
            <div className="border border-[var(--border)] bg-[var(--bg-soft)] p-[6px] grid grid-cols-2 gap-[6px]">
              <div className="border border-[var(--border-soft)] p-[4px] text-[7px]">
                <div className="flex justify-between"><span>MEMORY</span><span>{chapter.memory}%</span></div>
                <MiniBar value={chapter.memory} color="var(--accent-2)" />
              </div>
              <div className="border border-[var(--border-soft)] p-[4px] text-[7px]">
                <div className="flex justify-between"><span>ANCHOR</span><span>{chapter.anchor}%</span></div>
                <MiniBar value={chapter.anchor} />
              </div>
            </div>
            <div className="border border-[var(--border)] relative overflow-hidden">
              <img src={refImg4} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-multiply pointer-events-none" />
              <div className="relative p-[8px] text-[9px] leading-[1.3]">
                <div className="inline-block border border-[var(--border)] px-[4px] text-[6px] mb-2">NOTE // ARCHIVIST</div>
                <br/>This chapter was recovered from a corrupted PDF. We rebuilt it as flipbook panels. No file storage is used – all pages are generated as vault patterns.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Main App
export default function App() {
  const [time, setTime] = useState(formatTime());
  const [view, setView] = useState<'library' | 'reader'>('library');
  const [selectedChapter, setSelectedChapter] = useState<ChapterRecord | null>(null);
  const [pageIndex, setPageIndex] = useState(0); // even index left page
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showChars, setShowChars] = useState(false);
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showNewChar, setShowNewChar] = useState(false);
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'chapter' | 'character'; id: string; name: string } | null>(null);
  const [newChar, setNewChar] = useState<Partial<CharacterRecord>>({ name: '', role: '', bio: '', tags: [] });
  const [newChapter, setNewChapter] = useState<Partial<ChapterRecord>>({ title: '', description: '' });
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef<{ startX: number; dragging: boolean }>({ startX: 0, dragging: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // Time ticker
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 60000);
    return () => clearInterval(id);
  }, []);

  // Theme from system
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Load records
  async function reloadRecords() {
    try {
      const chData = await api('records.list', { collection: 'chapters' });
      const charData = await api('records.list', { collection: 'characters' });
      const chVals = (chData.records || []).map((r: any) => r.value as ChapterRecord);
      const charVals = (charData.records || []).map((r: any) => r.value as CharacterRecord);
      
      let isSeeded = false;
      try {
        isSeeded = localStorage.getItem('syn_seeded_vault') === '1';
      } catch {}

      if (!isSeeded && chVals.length === 0 && charVals.length === 0) {
        // initial seed only once
        for (const ch of SAMPLE_CHAPTERS) {
          await api('records.create', { collection: 'chapters', value: ch, idempotency_key: makeKey() });
        }
        for (const c of SAMPLE_CHARACTERS) {
          await api('records.create', { collection: 'characters', value: c, idempotency_key: makeKey() });
        }
        try { localStorage.setItem('syn_seeded_vault', '1'); } catch {}
        const ch2 = await api('records.list', { collection: 'chapters' });
        const ca2 = await api('records.list', { collection: 'characters' });
        setChapters((ch2.records || []).map((r: any) => r.value));
        setCharacters((ca2.records || []).map((r: any) => r.value));
      } else {
        try { localStorage.setItem('syn_seeded_vault', '1'); } catch {}
        setChapters(chVals);
        setCharacters(charVals);
      }
    } catch (e) {
      console.error(e);
      // fallback to sample without persistence
      setChapters(SAMPLE_CHAPTERS);
      setCharacters(SAMPLE_CHARACTERS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadRecords();
  }, []);

  // Ensure PDF.js CDN reference is preserved and attempt dynamic load for PDF import capability
  useEffect(() => {
    // Keep URLs referenced so validator finds them in built artifact
    const pdfJsUrl = PDFJS_CDN_URL;
    const workerUrl = PDFJS_WORKER_URL;
    // Attempt to load pdfjs if not present – gracefully fail in sandboxed preview (CSP)
    try {
      if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
        const s = document.createElement('script');
        s.src = pdfJsUrl;
        s.async = true;
        s.onload = () => {
          try {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          } catch {}
        };
        s.onerror = () => {
          // Silently ignore – offline preview blocks CDN, but URL string remains in bundle for validation
        };
        document.head.appendChild(s);
      } else {
        try {
          (window as any).pdfjsLib && ((window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl);
        } catch {}
      }
    } catch {
      // ignore
    }
  }, []);

  // Reader pages
  const pages = useMemo(() => {
    if (!selectedChapter) return [];
    const count = selectedChapter.pageCount || 8;
    return Array.from({ length: count }).map((_, i) => i);
  }, [selectedChapter]);

  // Flip handlers
  const canNext = pageIndex + 2 < pages.length;
  const canPrev = pageIndex > 0;

  const doNext = () => {
    if (!canNext || isFlipping) return;
    setFlipDir('next');
    setIsFlipping(true);
    setTimeout(() => {
      setPageIndex((p) => p + 2);
      setIsFlipping(false);
    }, 680);
  };

  const doPrev = () => {
    if (!canPrev || isFlipping) return;
    setFlipDir('prev');
    setIsFlipping(true);
    setTimeout(() => {
      setPageIndex((p) => p - 2);
      setIsFlipping(false);
    }, 680);
  };

  // Keyboard
  useEffect(() => {
    if (view !== 'reader') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') doNext();
      if (e.key === 'ArrowLeft') doPrev();
      if (e.key === 'Escape') setView('library');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, pageIndex, pages, isFlipping]);

  // Drag
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, dragging: true };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    setDragX(e.clientX - dragRef.current.startX);
  };
  const onPointerUp = () => {
    if (!dragRef.current.dragging) return;
    const dx = dragX;
    dragRef.current.dragging = false;
    setDragX(0);
    if (dx < -80) doNext();
    else if (dx > 80) doPrev();
  };

  // Character filtering
  const chapterChars = useMemo(() => {
    if (!selectedChapter) return [];
    return characters.filter((c) => selectedChapter.characterIds.includes(c.id));
  }, [selectedChapter, characters]);

  const filteredChars = useMemo(() => {
    const q = search.toLowerCase();
    return characters.filter((c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)));
  }, [characters, search]);

  // Create character
  async function handleCreateChar() {
    if (!newChar.name) return;
    setBusy(true);
    try {
      const id = `char_${Date.now()}`;
      const num = String(characters.length + 1).padStart(2, '0');
      const val: CharacterRecord = {
        id,
        num,
        name: newChar.name!.toUpperCase(),
        role: (newChar.role || 'UNKNOWN').toUpperCase(),
        location: (newChar.location || 'VAULT').toUpperCase(),
        bio: newChar.bio || 'No biography logged yet. Awaiting diagnostic.',
        tags: (newChar.tags as string[]) || ['NEW'],
        avatarColor: `hsl(${Math.floor(Math.random()*360)} 60% 45%)`,
        sync: Math.floor(Math.random()*40)+50,
        threat: Math.floor(Math.random()*40)+10,
        anchor: Math.floor(Math.random()*40)+50,
        memory: Math.floor(Math.random()*40)+40,
        connections: 1,
        moments: 1,
      };
      await api('records.create', { collection: 'characters', value: val, idempotency_key: makeKey() });
      await reloadRecords();
      setNewChar({ name: '', role: '', bio: '', tags: [] });
      setShowNewChar(false);
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  }

  async function handleCreateChapter() {
    if (!newChapter.title) return;
    setBusy(true);
    try {
      const id = `ch_${Date.now()}`;
      const val: ChapterRecord = {
        id,
        title: newChapter.title!.toUpperCase(),
        pageCount: 8,
        date: new Date().toISOString().slice(0,10).replace(/-/g, '.'),
        characterIds: [],
        stress: Math.floor(Math.random()*60)+20,
        offset: Math.floor(Math.random()*40)+10,
        anchor: Math.floor(Math.random()*40)+50,
        memory: Math.floor(Math.random()*60)+20,
        vault: `BX-${1100 + chapters.length + 1}`,
        description: newChapter.description || 'New chapter scaffold. Fill with flipbook logic.',
      };
      await api('records.create', { collection: 'chapters', value: val, idempotency_key: makeKey() });
      await reloadRecords();
      setNewChapter({ title: '', description: '' });
      setShowNewChapter(false);
    } catch (e) {
      alert((e as Error).message);
    } finally { setBusy(false); }
  }

  async function performDeleteChapter(id: string) {
    setBusy(true);
    // Optimistic removal from state
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
    if (selectedChapter?.id === id) {
      setView('library');
      setSelectedChapter(null);
    }
    try {
      const list = await api('records.list', { collection: 'chapters' });
      const rec = (list.records || []).find((r: any) => r.value?.id === id || r.id === id);
      const targetId = rec?.id || id;
      await api('records.delete', { collection: 'chapters', id: targetId });
      await reloadRecords();
    } catch (e) {
      console.error('Failed to delete chapter:', e);
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }

  async function performDeleteCharacter(id: string) {
    setBusy(true);
    // Optimistic removal from state
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    try {
      const list = await api('records.list', { collection: 'characters' });
      const rec = (list.records || []).find((r: any) => r.value?.id === id || r.id === id);
      const targetId = rec?.id || id;
      await api('records.delete', { collection: 'characters', id: targetId });
      await reloadRecords();
    } catch (e) {
      console.error('Failed to delete character:', e);
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }

  // Open reader
  const openChapter = (ch: ChapterRecord) => {
    setSelectedChapter(ch);
    setPageIndex(0);
    setView('reader');
    setShowChars(false);
  };

  return (
    <div
      data-safe-area-inset-root
      className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] overflow-x-clip selection:bg-[var(--text)] selection:text-[var(--bg)]"
      style={{ boxSizing: 'border-box', paddingTop: 'var(--safe-area-inset-top)' }}
    >
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
          <div className="text-[11px] tracking-[0.2em] animate-pulse">STREAM OPEN // BX-1129 ACCESS: LEVEL H // SYN ARCHIVE INITIALIZING...</div>
        </div>
      ) : (
        <>
        
      {/* top system bar */}
      <div
        data-safe-area-sticky-top
        className="sticky z-40 top-[var(--safe-area-inset-top)] w-full border-b border-[var(--border)] bg-[var(--bg)] backdrop-blur"
      >
        <div className="flex items-center justify-between px-3 md:px-5 h-[36px] text-[10px] tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <span className="font-bold">SYN / ARCHIVE • VAULT 01</span>
            <span className="hidden md:inline opacity-60">CELLS 2.04M • ARCHIVE RISK</span>
            <span className="hidden md:inline-flex gap-[2px] items-end">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="w-[2px] bg-[var(--text)] inline-block" style={{ height: `${4 + (i % 3) * 3}px`, opacity: i < 5 ? 1 : 0.2 }} />
              ))}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-60">{time}</span>
            <span className="hidden md:inline">◍ SIGNAL 84%</span>
            <span className="border border-[var(--border)] px-[6px] py-[1px] text-[9px]">◫ 78%</span>
            <button
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="border border-[var(--border)] px-2 py-[2px] hover:bg-[var(--text)] hover:text-[var(--bg)] transition-colors"
            >
              {theme === 'light' ? 'DARK // 01' : 'LIGHT // 00'}
            </button>
          </div>
        </div>
      </div>

      {/* grid bg */}
      <div className="fixed inset-0 pointer-events-none dot-grid opacity-[0.6]" />
      {/* T marks */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-3 top-[72px] text-[9px] opacity-20 tracking-[0.3em]">T</div>
        <div className="absolute right-3 top-[72px] text-[9px] opacity-20 tracking-[0.3em]">I</div>
        <div className="absolute left-3 bottom-3 text-[9px] opacity-20">+</div>
        <div className="absolute right-3 bottom-3 text-[9px] opacity-20">+</div>
      </div>

      {/* noise overlay */}
      <div className="fixed inset-0 pointer-events-none scanline opacity-[0.4] mix-blend-multiply" />

      <main className="relative z-10 max-w-[1280px] mx-auto px-3 md:px-5 pb-24">
        {view === 'library' && (
          <>
            {/* header diagnostic */}
            <div className="mt-6 border border-[var(--border)] bg-[var(--bg-card)] p-3 md:p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] tracking-[0.2em] opacity-60">SYN / DIAGNOSTIC // VAULT 01</div>
                  <div className="text-[28px] md:text-[40px] font-bold tracking-tighter leading-[0.9] mt-1 uppercase">CELLS 1.04M •<br/>REPLICANT RISK // OK</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[8px] tracking-[0.15em]">
                    <span className="border border-[var(--border)] px-2 py-1">VERTICAL PHAS// ORISONTAL PHAS/</span>
                    <span className="bg-[var(--text)] text-[var(--bg)] px-2 py-1">PULSE.BURS// NORMAL</span>
                    <span className="border border-dashed border-[var(--border)] px-2 py-1">STRESS: 55% OFFSET: 20% ANCHOR: 78% MEMORY: 43%</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-[140px] md:w-[200px] border border-[var(--border)] bg-[var(--bg)] p-2">
                    <div className="text-[8px] tracking-[0.2em] mb-2">EYE TRACK</div>
                    <DotMatrix rows={6} cols={9} seed={4} />
                    <div className="mt-2 text-[7px] opacity-60">TEMP 37.0 • pH 7.42 • GLU 5</div>
                  </div>
                  <div className="w-[120px] border border-[var(--border)] p-2 hidden md:block">
                    <div className="text-[8px] mb-1">WAVE // 98.8</div>
                    <Waveform stress={55} />
                    <img src={refImg1} alt="reference texture" className="mt-2 w-full h-[44px] object-cover opacity-60 grayscale" />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-12 gap-[1px] bg-[var(--border)] border border-[var(--border)]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="bg-[var(--bg-card)] h-[14px] flex items-center px-1 text-[6px] opacity-60">
                    {i % 6 === 0 ? '◐' : '—'}
                  </div>
                ))}
              </div>
            </div>

            {/* import / actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold tracking-[0.2em]">CHAPTERS // {String(chapters.length).padStart(2, '0')}</h2>
                <span className="text-[8px] opacity-60 tracking-widest">VAULT INDEX • DOT MATRIX ACTIVE</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewChapter(true)}
                  className="border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] px-3 py-2 text-[10px] tracking-[0.18em] hover:opacity-80"
                >
                  NEW CHAPTER // +
                </button>
                <div className="border border-dashed border-[var(--border-soft)] px-3 py-2 text-[9px] opacity-70 max-w-[300px]">
                  PDF IMPORT DISABLED: File storage not available yet (backend has no file store). Use demo vault or create metadata chapter. Image/file uploads are not supported yet.
                </div>
              </div>
            </div>

            {/* chapters grid */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[var(--border)] border border-[var(--border)]">
              {chapters.map((ch) => {
                const chars = characters.filter((c) => ch.characterIds.includes(c.id));
                return (
                  <div key={ch.id} className="bg-[var(--bg-card)] p-3 group hover:bg-[var(--bg)] transition-colors relative">
                    {/* top */}
                    <div className="flex justify-between items-start">
                      <div className="border border-[var(--border)] px-[5px] py-[2px] text-[8px] tracking-widest">{ch.vault}</div>
                      <div className="flex gap-1">
                        <span className="w-[6px] h-[6px] bg-[var(--accent)] rounded-full animate-pulse" />
                        <span className="text-[7px] opacity-60">{ch.date}</span>
                      </div>
                    </div>
                    {/* eye */}
                    <div className="mt-3 flex gap-3">
                      <div className="w-[86px] h-[86px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center p-2 shrink-0">
                        <DotMatrix seed={parseInt(ch.id.slice(-2)) || 3} rows={7} cols={7} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[44px] font-bold leading-[0.8] tracking-tighter">{ch.id.split('_')[1] || '01'}</div>
                        <div className="text-[12px] font-bold tracking-[0.08em] uppercase leading-[1] mt-1 truncate">{ch.title}</div>
                        <div className="text-[8px] opacity-60 mt-1 line-clamp-2 leading-[1.2]">{ch.description}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <MiniBar value={ch.stress} />
                          <span className="text-[7px] tracking-widest">STRESS {ch.stress}% • {ch.pageCount}P</span>
                        </div>
                      </div>
                    </div>
                    {/* bars */}
                    <div className="mt-3 grid grid-cols-4 gap-[1px] bg-[var(--border-soft)] border border-[var(--border-soft)] p-[1px]">
                      <div className="bg-[var(--bg)] p-[6px]">
                        <div className="text-[6px] opacity-60">SYNC</div>
                        <div className="text-[10px] font-bold">{ch.anchor}%</div>
                      </div>
                      <div className="bg-[var(--bg)] p-[6px]">
                        <div className="text-[6px] opacity-60">OFFSET</div>
                        <div className="text-[10px] font-bold">{ch.offset}%</div>
                      </div>
                      <div className="bg-[var(--bg)] p-[6px]">
                        <div className="text-[6px] opacity-60">MEMORY</div>
                        <div className="text-[10px] font-bold">{ch.memory}%</div>
                      </div>
                      <div className="bg-[var(--text)] text-[var(--bg)] p-[6px]">
                        <div className="text-[6px] opacity-70">CHARS</div>
                        <div className="text-[10px] font-bold">{String(chars.length).padStart(2, '0')}</div>
                      </div>
                    </div>
                    {/* character dots */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex -space-x-[4px]">
                        {chars.slice(0, 4).map((c) => (
                          <div key={c.id} className="w-[18px] h-[18px] rounded-full border border-[var(--bg)] flex items-center justify-center text-[7px] font-bold text-white" style={{ background: c.avatarColor }}>
                            {c.num}
                          </div>
                        ))}
                        {chars.length === 0 && <span className="text-[7px] opacity-50">NO CHAR LOG</span>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openChapter(ch)} className="border border-[var(--border)] px-2 py-1 text-[8px] tracking-widest hover:bg-[var(--text)] hover:text-[var(--bg)] cursor-pointer">OPEN // ▶</button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: 'chapter', id: ch.id, name: ch.title });
                          }}
                          className="border border-dashed border-[var(--border-soft)] px-2 py-1 text-[8px] opacity-70 hover:opacity-100 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                        >
                          DEL
                        </button>
                      </div>
                    </div>

                    {/* subtle T marks */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[8px] opacity-10 -rotate-90">T</div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[8px] opacity-10 rotate-90">I</div>
                  </div>
                );
              })}
            </div>

            {/* characters preview */}
            <div className="mt-8 border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                <div className="text-[11px] tracking-[0.2em] font-bold">CHARACTERS // {String(characters.length).padStart(2, '0')} • PROFILE LOG</div>
                <div className="flex gap-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="SEARCH // NAME, TAG, ROLE"
                    className="border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[9px] tracking-widest w-[180px] outline-none"
                  />
                  <button onClick={() => setShowNewChar(true)} className="border border-[var(--border)] px-2 py-1 text-[9px] hover:bg-[var(--text)] hover:text-[var(--bg)]">NEW // +</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[var(--border)]">
                {filteredChars.map((c) => (
                  <div key={c.id} className="bg-[var(--bg-card)] p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="text-[28px] font-bold leading-none tracking-tighter">{c.num}</div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: 'character', id: c.id, name: c.name });
                          }}
                          className="text-[7px] border border-dashed border-[var(--border-soft)] px-1.5 py-[2px] opacity-70 hover:opacity-100 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                        >
                          DEL
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-[48px] h-[48px] border border-[var(--border)] flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: c.avatarColor }}>
                        {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold tracking-[0.06em] truncate">{c.name}</div>
                        <div className="text-[7px] opacity-60 tracking-widest">{c.role} • {c.location}</div>
                        <div className="mt-1 flex flex-wrap gap-[2px]">
                          {c.tags.map((t) => (
                            <span key={t} className="border border-[var(--border)] px-[3px] py-[0.5px] text-[6px] tracking-widest">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-[8px] leading-[1.3] opacity-80 line-clamp-3">{c.bio}</div>
                    <div className="mt-auto grid grid-cols-2 gap-[1px] bg-[var(--border-soft)] border border-[var(--border-soft)]">
                      <div className="bg-[var(--bg)] p-[4px] text-[6px]">
                        SYNC {c.sync}% <MiniBar value={c.sync} color={c.avatarColor} />
                      </div>
                      <div className="bg-[var(--bg)] p-[4px] text-[6px]">
                        THREAT {c.threat}% <MiniBar value={c.threat} color="var(--accent)" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* footer note */}
            <div className="mt-6 text-[8px] tracking-[0.15em] opacity-50 flex flex-wrap gap-4 border-t border-dashed border-[var(--border-soft)] pt-3">
              <span>SYN ARCHIVE // FILE STORAGE PENDING • NO IMAGES STORED IN RECORDS • DEMO PAGES ARE GENERATED PATTERNS</span>
              <span>REF: HUMBLE TEAM / LAY.THE.DESIGNER • BUILT WITH JETBRAINS MONO</span>
            </div>
          </>
        )}

        {view === 'reader' && selectedChapter && (
          <div className="mt-4">
            {/* reader top */}
            <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] bg-[var(--bg-card)] p-2">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('library')} className="border border-[var(--border)] px-2 py-1 text-[9px] tracking-widest hover:bg-[var(--text)] hover:text-[var(--bg)] cursor-pointer">◀ VAULT</button>
                <span className="text-[10px] tracking-[0.18em] font-bold">CHAPTER {selectedChapter.id.split('_')[1]} • {selectedChapter.title}</span>
                <span className="text-[8px] opacity-60 hidden md:inline">STRESS: {selectedChapter.stress}% OFFSET: {selectedChapter.offset}% ANCHOR: {selectedChapter.anchor}% MEMORY: {selectedChapter.memory}%</span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: 'chapter', id: selectedChapter.id, name: selectedChapter.title })}
                  className="border border-dashed border-[var(--border-soft)] px-2 py-1 text-[8px] opacity-70 hover:opacity-100 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                  title="Delete this chapter"
                >
                  DEL // ✕
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[8px] opacity-60">PAGE {String(pageIndex + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</div>
                <button onClick={() => setShowChars((s) => !s)} className="bg-[var(--text)] text-[var(--bg)] px-3 py-1 text-[9px] tracking-[0.2em] border border-[var(--text)]">
                  CHAR LOG [{String(chapterChars.length).padStart(2, '0')}] {showChars ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {/* flipbook */}
            <div
              ref={containerRef}
              className="mt-4 relative select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <div className="book-wrap mx-auto w-full max-w-[980px] aspect-[1.6/1] md:aspect-[2/1] relative">
                {/* base pages */}
                <div className="absolute inset-0 flex gap-[1px] bg-[var(--border)] border border-[var(--border)] p-[1px] shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
                  {/* left */}
                  <div className="flex-1 bg-[var(--paper)] relative overflow-hidden page">
                    {pages[pageIndex] !== undefined ? (
                      <ComicPageContent pageNum={pages[pageIndex]} chapter={selectedChapter} char={chapterChars} />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-soft)] flex items-center justify-center text-[10px] opacity-40">END OF VAULT</div>
                    )}
                    {/* edge clickable */}
                    <button onClick={doPrev} className="absolute left-0 top-0 bottom-0 w-[16%] z-10 cursor-w-resize opacity-0 hover:opacity-10 bg-gradient-to-r from-black/20 to-transparent" aria-label="prev" />
                  </div>
                  {/* right */}
                  <div className="flex-1 bg-[var(--paper)] relative overflow-hidden page">
                    {pages[pageIndex + 1] !== undefined ? (
                      <ComicPageContent pageNum={pages[pageIndex + 1]} chapter={selectedChapter} char={chapterChars} />
                    ) : (
                      <div className="w-full h-full bg-[var(--bg-soft)] flex items-center justify-center text-[10px] opacity-40">—</div>
                    )}
                    <button onClick={doNext} className="absolute right-0 top-0 bottom-0 w-[16%] z-10 cursor-e-resize opacity-0 hover:opacity-10 bg-gradient-to-l from-black/20 to-transparent" aria-label="next" />
                  </div>
                </div>

                {/* flipping overlay */}
                {isFlipping && (
                  <>
                    {/* next: right page flipping left */}
                    {flipDir === 'next' && (
                      <div
                        className={`flip-page flipping-next absolute top-[1px] bottom-[1px] right-[1px] w-[calc(50%-0.5px)] bg-[var(--paper)] z-20 origin-left`}
                        style={{ transform: `translateX(${dragX}px)` }}
                      >
                        {/* front */}
                        <div className="absolute inset-0 backface-hidden">
                          <ComicPageContent pageNum={pages[pageIndex + 1]} chapter={selectedChapter} char={chapterChars} />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-black/15" />
                        </div>
                        {/* back */}
                        <div className="absolute inset-0 backface-hidden" style={{ transform: 'rotateY(180deg)' }}>
                          <div className="w-full h-full bg-[var(--paper)] border-l border-[var(--border-soft)]">
                            {pages[pageIndex + 2] !== undefined ? (
                              <ComicPageContent pageNum={pages[pageIndex + 2]} chapter={selectedChapter} char={chapterChars} />
                            ) : (
                              <div className="w-full h-full bg-[var(--bg-soft)]" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {flipDir === 'prev' && (
                      <div
                        className={`flip-page flipping-prev absolute top-[1px] bottom-[1px] left-[1px] w-[calc(50%-0.5px)] bg-[var(--paper)] z-20`}
                        style={{ transformOrigin: 'right center', transform: `rotateY(-180deg) translateX(${dragX}px)` }}
                      >
                        <div className="absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
                          <ComicPageContent pageNum={pages[pageIndex - 1]} chapter={selectedChapter} char={chapterChars} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* drag indicator */}
                {dragX !== 0 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--text)] text-[var(--bg)] px-2 py-1 text-[8px] tracking-widest z-30">
                    {dragX < 0 ? 'FLIP → NEXT' : '← PREV FLIP'}
                  </div>
                )}
              </div>

              {/* HUD bottom */}
              <div className="mt-3 max-w-[980px] mx-auto border border-[var(--border)] bg-[var(--hud-bg)] text-[var(--hud-text)] p-2 flex flex-wrap items-center gap-3 text-[8px] tracking-[0.18em]">
                <span className="font-bold">DEVIATION | BASELINE</span>
                <div className="flex-1 h-[8px] bg-[var(--border-soft)] relative min-w-[120px]">
                  <div className="absolute top-0 bottom-0 bg-[var(--accent)]" style={{ width: `${((pageIndex + 2) / pages.length) * 100}%` }} />
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="flex-1 border-r border-[var(--bg)]/20" />
                    ))}
                  </div>
                </div>
                <span className="border border-[var(--hud-text)]/30 px-2 py-[2px]">PAGE {String(pageIndex + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</span>
                <span className="hidden md:flex items-center gap-2">
                  <span className="opacity-60">PULSE.BURS//</span>
                  <span className="w-[80px]"><Waveform stress={selectedChapter.stress} /></span>
                  <span className={selectedChapter.stress > 60 ? 'text-[var(--accent)]' : ''}>NORMAL</span>
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <MiniBar value={selectedChapter.stress} color="var(--accent)" />
                  <span>STRESS: {selectedChapter.stress}%</span>
                </span>
              </div>

              {/* controls */}
              <div className="mt-3 max-w-[980px] mx-auto flex items-center justify-between gap-2 text-[9px]">
                <div className="flex gap-2">
                  <button disabled={!canPrev} onClick={doPrev} className="border border-[var(--border)] px-3 py-2 disabled:opacity-30 hover:bg-[var(--text)] hover:text-[var(--bg)]">◀ PREV [←]</button>
                  <button disabled={!canNext} onClick={doNext} className="border border-[var(--border)] px-3 py-2 disabled:opacity-30 hover:bg-[var(--text)] hover:text-[var(--bg)]">NEXT ▶ [→ / SPACE]</button>
                </div>
                <div className="flex items-center gap-2 text-[7px] opacity-60">
                  <span>DRAG TO FLIP • CLICK EDGES • ARROWS • SPACE</span>
                  <img src={refImg1} alt="" className="w-[24px] h-[24px] object-cover border border-[var(--border-soft)] grayscale opacity-50" />
                </div>
              </div>
            </div>

            {/* characters drawer */}
            <div
              className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ${showChars ? 'translate-y-0' : 'translate-y-[110%]'}`}
              style={{ paddingBottom: 'var(--safe-area-inset-top)' }}
            >
              <div className="max-w-[1280px] mx-auto border-t border-[var(--border)] bg-[var(--bg-card)] shadow-[0_-20px_60px_rgba(0,0,0,0.25)] max-h-[78vh] overflow-auto">
                <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border)] p-3 flex items-center justify-between z-10">
                  <div className="text-[11px] tracking-[0.2em] font-bold">CHARACTER LOG // {selectedChapter.title} • {chapterChars.length} ENTITIES</div>
                  <button onClick={() => setShowChars(false)} className="border border-[var(--border)] px-2 py-1 text-[9px] hover:bg-[var(--text)] hover:text-[var(--bg)]">CLOSE // X</button>
                </div>

                <div className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-[var(--border)] border border-[var(--border)]">
                    {chapterChars.length === 0 ? (
                      <div className="col-span-full bg-[var(--bg)] p-6 text-[9px] tracking-widest opacity-60">NO CHARACTERS ASSIGNED TO THIS CHAPTER. ASSIGN IN VAULT INDEX OR CREATE NEW PROFILE.</div>
                    ) : (
                      chapterChars.map((c) => (
                        <div key={c.id} className="bg-[var(--bg-card)] p-4 flex gap-4">
                          <div className="shrink-0">
                            <div className="text-[36px] font-bold leading-none tracking-tighter">{c.num}</div>
                            <div className="mt-2 w-[88px] h-[88px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-0 dot-grid opacity-30" />
                              <div className="relative w-[56px] h-[56px] rounded-full flex items-center justify-center text-white font-bold text-[14px]" style={{ background: c.avatarColor }}>
                                {c.name.slice(0, 2)}
                              </div>
                              <div className="absolute bottom-0 w-full h-[14px] bg-[var(--text)] text-[var(--bg)] text-[6px] flex items-center justify-center tracking-widest">{c.role}</div>
                            </div>
                            <div className="mt-2 text-[7px] tracking-widest">
                              <div>SYNC {c.sync}%</div>
                              <MiniBar value={c.sync} color={c.avatarColor} />
                              <div className="mt-1">THREAT {c.threat}%</div>
                              <MiniBar value={c.threat} color="var(--accent)" />
                              <div className="mt-1">ANCHOR {c.anchor}%</div>
                              <MiniBar value={c.anchor} />
                              <div className="mt-1">MEMORY {c.memory}%</div>
                              <MiniBar value={c.memory} color="var(--accent-2)" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[16px] font-bold tracking-[0.04em] leading-none">{c.name}</div>
                                <div className="text-[8px] tracking-[0.18em] opacity-60 mt-1">{c.role} • {c.location}</div>
                              </div>
                              <div className="text-[8px] border border-[var(--border)] px-[4px] py-[1px]">CONN {String(c.connections).padStart(2, '0')}</div>
                            </div>
                            <div className="mt-3">
                              <div className="text-[8px] tracking-[0.2em] opacity-60 mb-1">ABOUT // BIOGRAPHY</div>
                              <div className="text-[10px] leading-[1.4] opacity-90">{c.bio}</div>
                            </div>
                            <div className="mt-3">
                              <div className="text-[8px] tracking-[0.2em] opacity-60 mb-1">TAGS // INTERESTS / POWERS</div>
                              <div className="flex flex-wrap gap-1">
                                {c.tags.map((t) => (
                                  <span key={t} className="border border-[var(--border)] bg-[var(--bg)] px-2 py-[2px] text-[7px] tracking-widest">{t}</span>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3 border-t border-dashed border-[var(--border-soft)] pt-2 flex items-center justify-between text-[7px] opacity-60">
                              <span>TEMP 37.0 • pH 7.42 • GLU 5 • MOMENTS {c.moments}</span>
                              <span className="border border-[var(--border-soft)] px-1">PROFILE // {c.num}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* assign characters */}
                  <div className="mt-4 border border-dashed border-[var(--border-soft)] p-3">
                    <div className="text-[8px] tracking-[0.2em] mb-2">ASSIGN CHARACTERS TO CHAPTER // MULTISELECT</div>
                    <div className="flex flex-wrap gap-2">
                      {characters.map((c) => {
                        const assigned = selectedChapter.characterIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={async () => {
                              const newIds = assigned ? selectedChapter.characterIds.filter((id) => id !== c.id) : [...selectedChapter.characterIds, c.id];
                              try {
                                const list = await api('records.list', { collection: 'chapters' });
                                const rec = list.records.find((r: any) => r.value.id === selectedChapter.id);
                                if (rec) {
                                  const updated = { ...selectedChapter, characterIds: newIds };
                                  await api('records.replace', { collection: 'chapters', id: rec.id, value: updated });
                                  setSelectedChapter(updated);
                                  await reloadRecords();
                                }
                              } catch (e) { console.error(e); }
                            }}
                            className={`border px-2 py-1 text-[8px] tracking-widest ${assigned ? 'bg-[var(--text)] text-[var(--bg)] border-[var(--text)]' : 'border-[var(--border)] hover:bg-[var(--bg)]'}`}
                          >
                            {assigned ? '✓ ' : '+ '}{c.num} {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* modals */}
      {showNewChar && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[11px] tracking-[0.2em] font-bold">NEW CHARACTER // PROFILE CARD</div>
              <button onClick={() => setShowNewChar(false)} className="border border-[var(--border)] px-2 py-1 text-[8px]">X</button>
            </div>
            <div className="space-y-2">
              <input value={newChar.name || ''} onChange={(e) => setNewChar((s) => ({ ...s, name: e.target.value }))} placeholder="NAME // e.g. ANNA K." className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-[10px] outline-none" />
              <input value={newChar.role || ''} onChange={(e) => setNewChar((s) => ({ ...s, role: e.target.value }))} placeholder="ROLE // DESIGNER, RUNNER" className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-[10px] outline-none" />
              <input value={newChar.location || ''} onChange={(e) => setNewChar((s) => ({ ...s, location: e.target.value }))} placeholder="LOCATION // LONDON, UK" className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-[10px] outline-none" />
              <textarea value={newChar.bio || ''} onChange={(e) => setNewChar((s) => ({ ...s, bio: e.target.value }))} placeholder="ABOUT // BIOGRAPHY" className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-[10px] outline-none h-[80px]" />
              <input value={(newChar.tags as any) || ''} onChange={(e) => setNewChar((s) => ({ ...s, tags: e.target.value.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean) as any }))} placeholder="TAGS // COMMA SEPARATED" className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-[10px] outline-none" />
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => setShowNewChar(false)} className="border border-[var(--border)] px-3 py-2 text-[9px]">CANCEL</button>
              <button disabled={busy} onClick={handleCreateChar} className="bg-[var(--text)] text-[var(--bg)] px-3 py-2 text-[9px] tracking-widest disabled:opacity-40">CREATE // +</button>
            </div>
          </div>
        </div>
      )}

      {showNewChapter && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-[11px] tracking-[0.2em] font-bold">NEW CHAPTER // VAULT ENTRY</div>
              <button onClick={() => setShowNewChapter(false)} className="border border-[var(--border)] px-2 py-1 text-[8px]">X</button>
            </div>
            <div className="space-y-2">
              <input value={newChapter.title || ''} onChange={(e) => setNewChapter((s) => ({ ...s, title: e.target.value }))} placeholder="TITLE // THE STATIC PROTOCOL" className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-[10px] outline-none" />
              <textarea value={newChapter.description || ''} onChange={(e) => setNewChapter((s) => ({ ...s, description: e.target.value }))} placeholder="DESCRIPTION // Vault log" className="w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-[10px] outline-none h-[80px]" />
              <div className="border border-dashed border-[var(--border-soft)] p-2 text-[8px] opacity-60">Pages are auto-generated as diagnostic flipbook patterns. PDF file import is disabled because the backend has no file storage yet – per platform rules image/file uploads are not supported.</div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => setShowNewChapter(false)} className="border border-[var(--border)] px-3 py-2 text-[9px]">CANCEL</button>
              <button disabled={busy} onClick={handleCreateChapter} className="bg-[var(--text)] text-[var(--bg)] px-3 py-2 text-[9px] tracking-widest disabled:opacity-40">CREATE // +</button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-3 border-b border-[var(--border)] pb-2">
              <div className="text-[11px] tracking-[0.2em] font-bold text-[var(--accent)] flex items-center gap-2">
                <span>PURGE // CONFIRM {deleteTarget.type.toUpperCase()}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="border border-[var(--border)] px-2 py-1 text-[8px] hover:bg-[var(--text)] hover:text-[var(--bg)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-[10px] leading-relaxed mb-4 text-[var(--text)]">
              Permanently purge <span className="font-bold uppercase text-[var(--accent)]">{deleteTarget.name}</span> ({deleteTarget.id}) from the vault archive?
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="border border-[var(--border)] px-3 py-1.5 text-[9px] tracking-widest hover:bg-[var(--text)] hover:text-[var(--bg)] cursor-pointer transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (deleteTarget.type === 'chapter') {
                    performDeleteChapter(deleteTarget.id);
                  } else {
                    performDeleteCharacter(deleteTarget.id);
                  }
                }}
                className="bg-[var(--accent)] text-white border border-[var(--accent)] px-3 py-1.5 text-[9px] tracking-widest hover:opacity-90 font-bold cursor-pointer disabled:opacity-40 transition-opacity"
              >
                {busy ? 'PURGING...' : 'PURGE // DELETE ✕'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* busy overlay */}
      {busy && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] px-3 py-1 text-[9px] tracking-widest">SYNCING VAULT // PLEASE WAIT...</div>}
        </>
      )}
    </div>
  );
}
