import { describe, expect, it } from 'vitest';
import { createDefaultStorage } from '@/shared/seed/default-data';
import type { Task } from '@/shared/schemas';
import { seedStorage } from '../../../tests/helpers/chrome-mock';
import { FocusTabError } from './errors';
import { handleTaskDeleteArchived } from './handlers';

const ISO = '2026-06-18T00:00:00.000Z';

function archivedTask(id: string, modeId: string): Task {
  return {
    id,
    modeId,
    text: `archived-${id}`,
    completed: true,
    sortOrder: 0,
    createdAt: ISO,
    updatedAt: ISO,
    archivedAt: ISO,
  };
}

function activeTask(id: string, modeId: string): Task {
  return {
    id,
    modeId,
    text: `active-${id}`,
    completed: false,
    sortOrder: 0,
    createdAt: ISO,
    updatedAt: ISO,
  };
}

describe('handleTaskDeleteArchived', () => {
  it('指定モードのアーカイブ済みタスクのみ削除する', async () => {
    const base = createDefaultStorage();
    seedStorage({
      ...base,
      tasks: [
        activeTask('00000000-0000-4000-8000-000000000101', 'work'),
        archivedTask('00000000-0000-4000-8000-000000000102', 'work'),
        archivedTask('00000000-0000-4000-8000-000000000103', 'work'),
        archivedTask('00000000-0000-4000-8000-000000000104', 'study'),
      ],
    });

    const result = await handleTaskDeleteArchived('work');
    expect(result).toEqual({ deletedCount: 2 });

    const { loadStorage } = await import('./state');
    const data = await loadStorage();
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks.map((t) => t.id)).toEqual([
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000104',
    ]);
  });

  it('対象が 0 件でもエラーにしない', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    const result = await handleTaskDeleteArchived('work');
    expect(result).toEqual({ deletedCount: 0 });
  });

  it('存在しない modeId は INVALID_MODE', async () => {
    const base = createDefaultStorage();
    seedStorage(base);

    await expect(handleTaskDeleteArchived('missing')).rejects.toBeInstanceOf(FocusTabError);
    await expect(handleTaskDeleteArchived('missing')).rejects.toMatchObject({
      code: 'INVALID_MODE',
    });
  });
});
