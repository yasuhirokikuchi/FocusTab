import { migrateStorage, storageToRecord } from '@/shared/migration';
import { storageSchema, type StorageSchema } from '@/shared/schemas';

export async function loadStorage(): Promise<StorageSchema> {
  const raw = await chrome.storage.local.get(null);
  return storageSchema.parse(migrateStorage(raw));
}

export async function saveStorage(data: StorageSchema): Promise<void> {
  await chrome.storage.local.set(storageToRecord(data));
}

export async function updateStorage(
  updater: (current: StorageSchema) => StorageSchema,
): Promise<StorageSchema> {
  const current = await loadStorage();
  const next = storageSchema.parse(updater(current));
  await saveStorage(next);
  return next;
}

export async function patchStorage(
  partial: Partial<StorageSchema>,
): Promise<StorageSchema> {
  return updateStorage((current) => ({ ...current, ...partial }));
}
