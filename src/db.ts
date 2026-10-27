import { get, set } from 'idb-keyval';

export type StoredRecord = {
  id: string;
  value: any;
};

const DB_PREFIX = 'syn_vault_idb_';

export async function offlineGetRecords(collection: string): Promise<StoredRecord[]> {
  try {
    const data = await get<StoredRecord[]>(`${DB_PREFIX}${collection}`);
    if (Array.isArray(data)) return data;
  } catch (err) {
    console.warn('IndexedDB read error:', err);
  }
  return [];
}

export async function offlineSaveRecords(collection: string, records: StoredRecord[]): Promise<void> {
  try {
    await set(`${DB_PREFIX}${collection}`, records);
  } catch (err) {
    console.warn('IndexedDB save error:', err);
  }
}

export async function offlineCreateRecord(collection: string, value: any): Promise<StoredRecord> {
  const records = await offlineGetRecords(collection);
  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: StoredRecord = { id, value };
  records.push(record);
  await offlineSaveRecords(collection, records);
  return record;
}

export async function offlineReplaceRecord(collection: string, id: string, value: any): Promise<StoredRecord | null> {
  const records = await offlineGetRecords(collection);
  const idx = records.findIndex((r) => r.id === id || r.value?.id === id);
  if (idx !== -1) {
    records[idx] = { id: records[idx].id, value };
    await offlineSaveRecords(collection, records);
    return records[idx];
  }
  return null;
}

export async function offlineDeleteRecord(collection: string, id: string): Promise<boolean> {
  const records = await offlineGetRecords(collection);
  const filtered = records.filter((r) => r.id !== id && r.value?.id !== id);
  await offlineSaveRecords(collection, filtered);
  return true;
}
