import { CURRENT_SCHEMA_VERSION } from '../constants';
import {
  bookmarkSchema,
  modeSchema,
  settingsSchema,
  storageSchema,
  taskSchema,
  type RawStorage,
  type StorageSchema,
} from '../schemas';
import { createDefaultStorage } from '../seed/default-data';

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly fromVersion?: number,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/** v0（schemaVersion 未設定）→ v1 */
export function migrateV0ToV1(raw: RawStorage): StorageSchema {
  const defaults = createDefaultStorage();

  const modes = parseArray(raw.modes, modeSchema, defaults.modes);
  const tasks = parseArray(raw.tasks, taskSchema, defaults.tasks);
  const bookmarks = parseArray(raw.bookmarks, bookmarkSchema, defaults.bookmarks);

  const activeModeId =
    raw.activeModeId && modes.some((m) => m.id === raw.activeModeId)
      ? raw.activeModeId
      : defaults.activeModeId;

  const settingsResult = settingsSchema.safeParse(raw.settings);
  const settings = settingsResult.success
    ? settingsResult.data
    : defaults.settings;

  return storageSchema.parse({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    modes: modes.length > 0 ? modes : defaults.modes,
    activeModeId,
    tasks,
    bookmarks,
    lockState: null,
    settings,
    tabSnapshots: {},
    restoreProgress: null,
  });
}

function parseArray<T>(
  items: unknown[] | undefined,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  fallback: T[],
): T[] {
  if (!items?.length) return fallback;
  const parsed = items
    .map((item) => schema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data as T);
  return parsed.length > 0 ? parsed : fallback;
}

/**
 * storage.local の生データを現行スキーマへマイグレーション。
 * 新規インストール（空）の場合はデフォルトデータを返す。
 */
export function migrateStorage(raw: Record<string, unknown> | null | undefined): StorageSchema {
  if (!raw || Object.keys(raw).length === 0) {
    return createDefaultStorage();
  }

  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;

  switch (version) {
    case 0:
      return migrateV0ToV1(raw as RawStorage);
    case CURRENT_SCHEMA_VERSION:
      return storageSchema.parse(raw);
    default:
      if (version > CURRENT_SCHEMA_VERSION) {
        throw new MigrationError(
          `未対応の schemaVersion: ${version}（アプリ更新が必要です）`,
          version,
        );
      }
      throw new MigrationError(
        `サポート終了の schemaVersion: ${version}`,
        version,
      );
  }
}

/** マイグレーション後データを storage.local キー単位で展開 */
export function storageToRecord(data: StorageSchema): Record<string, unknown> {
  return {
    schemaVersion: data.schemaVersion,
    modes: data.modes,
    activeModeId: data.activeModeId,
    tasks: data.tasks,
    bookmarks: data.bookmarks,
    lockState: data.lockState,
    settings: data.settings,
    tabSnapshots: data.tabSnapshots,
    restoreProgress: data.restoreProgress,
  };
}
