import { describe, expect, it } from 'vitest';
import { createDefaultStorage } from '@/shared/seed/default-data';
import { seedStorage } from '../../../tests/helpers/chrome-mock';
import { handleTaskUpdate } from './handlers';
import { loadStorage } from './state';

describe('handleTaskUpdate', () => {
  it('タスクのテキストを更新する', async () => {
    const base = createDefaultStorage();
    const taskId = base.tasks[0].id;
    seedStorage(base);

    await handleTaskUpdate(taskId, { text: '更新後のタスク' });

    const data = await loadStorage();
    const task = data.tasks.find((t) => t.id === taskId);
    expect(task?.text).toBe('更新後のタスク');
    expect(task?.updatedAt).not.toBe(base.tasks[0].updatedAt);
  });
});
