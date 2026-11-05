import React, { useEffect, useState } from "react";

type Props = { onStatusChange: (isAdmin: boolean) => void };

async function adminRequest(action: string, args: Record<string, unknown> = {}) {
  const response = await fetch("/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ action, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Administrator request failed.");
  return payload.data || {};
}

export function AdminAccess({ onStatusChange }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    adminRequest("admin.status")
      .then((data) => {
        if (!active) return;
        setIsAdmin(Boolean(data.isAdmin));
        onStatusChange(Boolean(data.isAdmin));
      })
      .catch(() => {
        if (active) onStatusChange(false);
      });
    return () => { active = false; };
  }, [onStatusChange]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      await adminRequest("admin.login", { password });
      setIsAdmin(true);
      onStatusChange(true);
      setPassword("");
      setShowLogin(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion administrateur impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try { await adminRequest("admin.logout"); } catch {}
    setIsAdmin(false);
    onStatusChange(false);
  }

  return (
    <>
      {isAdmin ? (
        <button type="button" onClick={logout} className="border border-current/40 px-2 py-1 text-[9px] tracking-wider hover:opacity-70">
          ADMIN • SIGN OUT
        </button>
      ) : (
        <button type="button" onClick={() => { setError(""); setShowLogin(true); }} className="border border-current/30 px-2 py-1 text-[9px] tracking-wider opacity-70 hover:opacity-100">
          ADMIN LOGIN
        </button>
      )}
      {showLogin && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={login} className="w-full max-w-[360px] border border-current/30 bg-[var(--bg-card,var(--bg))] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <strong className="text-[11px] tracking-[0.18em]">ADMINISTRATOR ACCESS</strong>
              <button type="button" onClick={() => setShowLogin(false)} className="border border-current/30 px-2 py-1 text-[10px]">✕</button>
            </div>
            <label className="block text-[9px] opacity-70 tracking-widest mb-2" htmlFor="media-admin-password">ADMIN PASSWORD</label>
            <input id="media-admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent border border-current/30 px-3 py-2 text-[12px] outline-none" placeholder="Enter administrator password" autoFocus />
            {error && <p role="alert" className="mt-3 text-[10px] text-red-400">{error}</p>}
            <button type="submit" disabled={!password || busy} className="mt-4 w-full bg-[var(--text,var(--fg))] text-[var(--bg)] px-3 py-2 text-[10px] font-bold tracking-widest disabled:opacity-40">
              {busy ? "VERIFYING..." : "UNLOCK ADMIN ACCESS"}
            </button>
            <p className="mt-3 text-[8px] opacity-50">Read access is public. Administration is restricted to the owner.</p>
          </form>
        </div>
      )}
    </>
  );
}
