import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@/shared/constants';
import { MigrationError, migrateStorage } from './index';
import { createDefaultStorage } from '../seed/default-data';

describe('migrateStorage', () => {
  it('空データはデフォルト storage を返す', () => {
    const result = migrateStorage(null);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.modes.length).toBeGreaterThan(0);
    expect(result.activeModeId).toBe('work');
  });

  it('現行 schemaVersion はそのままパースする', () => {
    const defaults = createDefaultStorage();
    const result = migrateStorage(defaults as unknown as Record<string, unknown>);
    expect(result.activeModeId).toBe(defaults.activeModeId);
    expect(result.tasks).toHaveLength(defaults.tasks.length);
  });

  it('schemaVersion 未設定は v0 としてマイグレーションする', () => {
    const defaults = createDefaultStorage();
    const { schemaVersion: _removed, ...rawV0 } = defaults;
    const result = migrateStorage(rawV0 as unknown as Record<string, unknown>);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.modes.map((m) => m.id)).toContain('work');
  });

  it('将来の schemaVersion は MigrationError', () => {
    expect(() =>
      migrateStorage({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }),
    ).toThrow(MigrationError);
  });
});
