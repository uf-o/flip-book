const OWNER = "uf-o";
const REPO = "flip-book";
const BRANCH = process.env.GITHUB_DATABASE_BRANCH || "main";
const FILE_PATH = "database.json";
const API = "https://api.github.com";

type RecordItem = { id: string; value: any };
type Database = { version: number; updatedAt: string; collections: Record<string, RecordItem[]> };

function respond(res: any, status: number, body: unknown) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Server configuration missing: GITHUB_TOKEN");
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

async function readDatabase(): Promise<{ db: Database; sha?: string }> {
  const response = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${encodeURIComponent(BRANCH)}`, { headers: githubHeaders() });
  if (response.status === 404) return { db: { version: 1, updatedAt: new Date().toISOString(), collections: {} } };
  if (!response.ok) throw new Error(`GitHub read failed (${response.status}): ${await response.text()}`);
  const file = await response.json() as { content: string; sha: string; encoding: string };
  const decoded = Buffer.from(file.content.replace(/\\n/g, ""), "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as Database;
  if (!parsed || typeof parsed !== "object" || !parsed.collections || typeof parsed.collections !== "object") {
    throw new Error("database.json has an invalid structure");
  }
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
  if (!process.env.GITHUB_TOKEN) return respond(res, 503, { error: "Shared database is not configured. Add GITHUB_TOKEN to Vercel Environment Variables." });
  if (req.body?.action !== "records.list" && process.env.LIBRARY_WRITES_ENABLED !== "true") return respond(res, 403, { error: "Shared library is currently read-only. Enable LIBRARY_WRITES_ENABLED only after choosing a write-access policy." });

  const { action, args = {} } = (req.body || {}) as { action?: string; args?: any };
  const collection = String(args.collection || "default");
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(collection)) return respond(res, 400, { error: "Invalid collection" });

  try {
    if (action === "records.list") {
      const { db } = await readDatabase();
      const records = db.collections[collection] || [];
      const limit = Math.min(Math.max(Number(args.limit) || 100, 1), 1000);
      return respond(res, 200, { data: { records: records.slice(0, limit) } });
    }

    if (!["records.create", "records.replace", "records.delete"].includes(String(action))) {
      return respond(res, 400, { error: "Unknown action" });
    }

    // Re-read and retry on concurrent GitHub updates to avoid losing another device's write.
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
        if (!message.includes("(409)") && !message.includes("(422)") || attempt === 3) throw error;
      }
    }
    return respond(res, 409, { error: "Database changed concurrently. Please retry." });
  } catch (error) {
    console.error("Shared database API error:", error);
    return respond(res, 502, { error: error instanceof Error ? error.message : "Shared database request failed" });
  }
}
