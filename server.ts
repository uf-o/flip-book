import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// In-memory data store for vault records
const collections: Record<string, Array<{ id: string; value: any }>> = {
  chapters: [],
  characters: [],
};

// API handler for vault actions
app.all(['/actions', '*/actions'], (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, args } = req.body || {};
  const collectionName = args?.collection || 'default';

  if (!collections[collectionName]) {
    collections[collectionName] = [];
  }

  const store = collections[collectionName];

  if (action === 'records.list') {
    return res.json({ data: { records: [...store] } });
  }

  if (action === 'records.create') {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record = { id, value: args.value };
    store.push(record);
    return res.json({ data: { record } });
  }

  if (action === 'records.replace') {
    const idx = store.findIndex((r) => r.id === args.id || r.value?.id === args.id);
    if (idx !== -1) {
      store[idx] = { id: store[idx].id, value: args.value };
      return res.json({ data: { record: store[idx] } });
    }
    return res.status(404).json({ error: 'Record not found' });
  }

  if (action === 'records.delete') {
    const idx = store.findIndex((r) => r.id === args.id || r.value?.id === args.id);
    if (idx !== -1) {
      const removed = store.splice(idx, 1)[0];
      return res.json({ data: { record: removed } });
    }
    return res.json({ data: { success: true } });
  }

  return res.json({ data: {} });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Flip Book Vault server running at http://${HOST}:${PORT}`);
  });
}

startServer();
