import { createHmac, timingSafeEqual } from "node:crypto";

const OWNER = "uf-o";
const REPO = "flip-book";
const BRANCH = process.env.GITHUB_DATABASE_BRANCH || "main";
const FILE_PATH = "database.json";
const API = "https://api.github.com";
const COOKIE = "media_admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

type RecordItem = { id: string; value: any };
type MediaFile = { contentType: string; size: number; totalChunks: number; chunks: string[]; updatedAt: string };
type Database = { version: number; updatedAt: string; collections: Record<string, RecordItem[]>; mediaFiles?: Record<string, MediaFile> };

function respond(res: any, status: number, body: unknown) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}
function cookieValue(req: any, name: string): string {
  const raw = String(req.headers?.cookie || "");
  const part = raw.split(";").map((v: string) => v.trim()).find((v: string) => v.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
}
function sign(value: string): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(value).digest("base64url");
}
function validAdminSession(req: any): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const token = cookieValue(req, COOKIE);
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.role === "admin" && Number(session.exp) > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
function githubHeaders() {
  const token = process.env.MEDIA_LIBRARY_SYNC;
  if (!token) throw new Error("Server configuration missing: MEDIA_LIBRARY_SYNC");
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}
async function readDatabase(): Promise<{ db: Database; sha?: string }> {
  const url = `${API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${encodeURIComponent(BRANCH)}`;
  const response = await fetch(url, { headers: githubHeaders() });
  if (response.status === 404) return { db: { version: 1, updatedAt: new Date().toISOString(), collections: {}, mediaFiles: {} } };
  if (!response.ok) throw new Error(`GitHub read failed (${response.status}): ${await response.text()}`);
  const file = await response.json() as { content?: string; sha: string };
  let decoded = "";
  if (file.content) decoded = Buffer.from(file.content.replace(/\\n/g, ""), "base64").toString("utf8");
  else {
    const raw = await fetch(url, { headers: { ...githubHeaders(), Accept: "application/vnd.github.raw+json" } });
    if (!raw.ok) throw new Error(`GitHub raw read failed (${raw.status}): ${await raw.text()}`);
    decoded = await raw.text();
  }
  const parsed = JSON.parse(decoded) as Database;
  if (!parsed || typeof parsed !== "object" || !parsed.collections || typeof parsed.collections !== "object") throw new Error("database.json has an invalid structure");
  if (!parsed.mediaFiles) parsed.mediaFiles = {};
  return { db: parsed, sha: file.sha };
}
async function writeDatabase(db: Database, sha?: string) {
  const content = Buffer.from(JSON.stringify(db, null, 2), "utf8").toString("base64");
  const response = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Sync shared media database", content, branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (!response.ok) throw new Error(`GitHub write failed (${response.status}): ${await response.text()}`);
}
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return respond(res, 405, { error: "Method not allowed" });
  const { action, args = {} } = (req.body || {}) as { action?: string; args?: any };

  if (action === "admin.status") return respond(res, 200, { data: { isAdmin: validAdminSession(req) } });
  if (action === "admin.logout") {
    res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
    return respond(res, 200, { data: { success: true } });
  }
  if (action === "admin.login") {
    const configuredPassword = process.env.ADMIN_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    if (!configuredPassword || !sessionSecret || sessionSecret.length < 32) return respond(res, 503, { error: "Admin access is not configured. Set ADMIN_PASSWORD and a 32+ character ADMIN_SESSION_SECRET in Vercel." });
    const supplied = String(args.password || "");
    const expected = Buffer.from(configuredPassword);
    const actual = Buffer.from(supplied);
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!matches) return respond(res, 401, { error: "Incorrect administrator password." });
    const payload = Buffer.from(JSON.stringify({ role: "admin", exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
    res.setHeader("Set-Cookie", `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`);
    return respond(res, 200, { data: { isAdmin: true } });
  }

  if (action !== "records.list" && action !== "media.getChunk" && !validAdminSession(req)) return respond(res, 401, { error: "Administrator access required. Sign in to manage this shared library." });
  if (!process.env.MEDIA_LIBRARY_SYNC) return respond(res, 503, { error: "Shared database is not configured. Configure MEDIA_LIBRARY_SYNC in Vercel Environment Variables." });

  const collection = String(args.collection || "default");
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(collection)) return respond(res, 400, { error: "Invalid collection" });

  try {
    if (action === "media.chunk") {
      const mediaId = String(args.mediaId || "");
      const index = Number(args.index);
      const totalChunks = Number(args.totalChunks);
      const chunk = String(args.chunkBase64 || "");
      if (!/^[a-zA-Z0-9_-]{1,120}$/.test(mediaId) || !Number.isInteger(index) || index < 0 || !Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 2000 || index >= totalChunks || !chunk || chunk.length > 3600000) return respond(res, 400, { error: "Invalid media chunk" });
      for (let attempt = 0; attempt < 4; attempt++) {
        const { db, sha } = await readDatabase();
        const previous = db.mediaFiles![mediaId];
        const entry: MediaFile = previous || { contentType: String(args.contentType || "application/octet-stream").slice(0, 120), size: Math.max(0, Number(args.size) || 0), totalChunks, chunks: Array(totalChunks).fill(""), updatedAt: new Date().toISOString() };
        if (entry.totalChunks !== totalChunks) return respond(res, 409, { error: "Media upload metadata mismatch" });
        entry.chunks[index] = chunk;
        entry.updatedAt = new Date().toISOString();
        db.mediaFiles![mediaId] = entry;
        db.updatedAt = entry.updatedAt;
        try { await writeDatabase(db, sha); return respond(res, 200, { data: { success: true, index, totalChunks } }); }
        catch (error) { const message = error instanceof Error ? error.message : String(error); if ((!message.includes("(409)") && !message.includes("(422)")) || attempt === 3) throw error; }
      }
      return respond(res, 409, { error: "Database changed concurrently. Please retry the media chunk." });
    }
    if (action === "media.getChunk") {
      const mediaId = String(args.mediaId || "");
      const index = Number(args.index);
      const { db } = await readDatabase();
      const entry = db.mediaFiles?.[mediaId];
      if (!entry || !Number.isInteger(index) || index < 0 || index >= entry.totalChunks || !entry.chunks[index]) return respond(res, 404, { error: "Media chunk not found" });
      return respond(res, 200, { data: { chunkBase64: entry.chunks[index], contentType: entry.contentType, size: entry.size, totalChunks: entry.totalChunks } });
    }
    if (action === "media.delete") {
      const mediaId = String(args.mediaId || "");
      if (!mediaId) return respond(res, 400, { error: "Media id is required" });
      const { db, sha } = await readDatabase();
      delete db.mediaFiles![mediaId];
      db.updatedAt = new Date().toISOString();
      await writeDatabase(db, sha);
      return respond(res, 200, { data: { success: true } });
    }
    if (action === "records.list") {
      const { db } = await readDatabase();
      const records = db.collections[collection] || [];
      const limit = Math.min(Math.max(Number(args.limit) || 100, 1), 1000);
      return respond(res, 200, { data: { records: records.slice(0, limit) } });
    }
    if (!["records.create", "records.replace", "records.delete"].includes(String(action))) return respond(res, 400, { error: "Unknown action" });

    for (let attempt = 0; attempt < 4; attempt++) {
      const { db, sha } = await readDatabase();
      const records = db.collections[collection] || [];
      let result: any;
      if (action === "records.create") {
        const id = String(args.idempotency_key || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        const existing = records.find((record) => record.id === id);
        if (existing) return respond(res, 200, { data: { record: existing } });
        result = { id, value: args.value } satisfies RecordItem;
        db.collections[collection] = [result, ...records];
      } else {
        const id = String(args.id || "");
        if (!id) return respond(res, 400, { error: "Record id is required" });
        const index = records.findIndex((record) => record.id === id || record.value?.id === id);
        if (action === "records.replace") {
          result = { id: index >= 0 ? records[index].id : id, value: args.value } satisfies RecordItem;
          const next = [...records];
          if (index >= 0) next[index] = result; else next.unshift(result);
          db.collections[collection] = next;
        } else {
          if (index >= 0) result = records[index];
          db.collections[collection] = records.filter((record) => record.id !== id && record.value?.id !== id);
        }
      }
      db.version = 1;
      db.updatedAt = new Date().toISOString();
      try {
        await writeDatabase(db, sha);
        if (action === "records.delete") return respond(res, 200, { data: { success: true, record: result || null } });
        return respond(res, 200, { data: { record: result } });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if ((!message.includes("(409)") && !message.includes("(422)")) || attempt === 3) throw error;
      }
    }
    return respond(res, 409, { error: "Database changed concurrently. Please retry." });
  } catch (error) {
    console.error("Shared database API error:", error);
    return respond(res, 502, { error: error instanceof Error ? error.message : "Shared database request failed" });
  }
}
