import { CURRENT_SCHEMA_VERSION, MAX_BOOKMARKS_PER_MODE, MAX_TASKS_PER_MODE } from '@/shared/constants';
import { FocusTabError } from './errors';
import type { Bookmark, Settings, Task } from '@/shared/schemas';
import {
  bookmarkSchema,
  modeSchema,
  modeSummarySchema,
  settingsSchema,
  storageSchema,
  taskSchema,
} from '@/shared/schemas';
import { loadStorage, updateStorage } from './state';
import { createMode, deleteMode, restoreDefaultModes, updateMode } from './mode';
import { emergencyUnlock, lockMode, unlockMode } from './lock';
import { getRestoreProgress } from './tabs';
import { switchMode } from './mode';

export async function buildAppState() {
  const data = await loadStorage();
  const activeMode = data.modes.find((m) => m.id === data.activeModeId);
  if (!activeMode) {
    throw new FocusTabError('INTERNAL', 'activeModeId が modes に存在しません');
  }
  const tasks = data.tasks
    .filter((t) => t.modeId === data.activeModeId && !t.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const archivedTasks = data.tasks
    .filter((t) => t.modeId === data.activeModeId && t.archivedAt)
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
  const bookmarks = data.bookmarks
    .filter((b) => b.modeId === data.activeModeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    activeModeId: data.activeModeId,
    activeMode: modeSummarySchema.parse(activeMode),
    modes: data.modes.map((m) => modeSummarySchema.parse(m)),
    modeConfigs: data.modes.map((m) => modeSchema.parse(m)),
    tasks,
    archivedTasks,
    bookmarks,
    lockState: data.lockState,
    restoreProgress: data.restoreProgress,
    settings: {
      confirmModeSwitch: data.settings.confirmModeSwitch,
      showRestoreProgress: data.settings.showRestoreProgress,
      onboardingCompleted: data.settings.onboardingCompleted,
      restoreBatchSize: data.settings.restoreBatchSize,
    },
  };
}

function countTasksForMode(tasks: Task[], modeId: string): number {
  return tasks.filter((t) => t.modeId === modeId && !t.archivedAt).length;
}

function countBookmarksForMode(bookmarks: Bookmark[], modeId: string): number {
  return bookmarks.filter((b) => b.modeId === modeId).length;
}

export async function handleTaskCreate(modeId: string, text: string): Promise<Task> {
  const now = new Date().toISOString();
  const task = taskSchema.parse({
    id: crypto.randomUUID(),
    modeId,
    text,
    completed: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });

  await updateStorage((current) => {
    if (!current.modes.some((m) => m.id === modeId)) {
      throw new FocusTabError('INVALID_MODE', 'モードが見つかりません');
    }
    if (countTasksForMode(current.tasks, modeId) >= MAX_TASKS_PER_MODE) {
      throw new FocusTabError('INTERNAL', `タスクはモードあたり最大 ${MAX_TASKS_PER_MODE} 件です`);
    }
    const maxOrder = current.tasks
      .filter((t) => t.modeId === modeId)
      .reduce((max, t) => Math.max(max, t.sortOrder), -1);
    return {
      ...current,
      tasks: [...current.tasks, { ...task, sortOrder: maxOrder + 1 }],
    };
  });

  return task;
}

export async function handleTaskUpdate(
  taskId: string,
  patch: Partial<{ text: string; completed: boolean; sortOrder: number }>,
): Promise<void> {
  await updateStorage((current) => {
    const index = current.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new FocusTabError('INTERNAL', 'タスクが見つかりません');
    const tasks = [...current.tasks];
    tasks[index] = taskSchema.parse({
      ...tasks[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    return { ...current, tasks };
  });
}

export async function handleTaskToggle(taskId: string): Promise<void> {
  const data = await loadStorage();
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) throw new FocusTabError('INTERNAL', 'タスクが見つかりません');
  await handleTaskUpdate(taskId, { completed: !task.completed });
}

export async function handleTaskDelete(taskId: string): Promise<void> {
  await updateStorage((current) => ({
    ...current,
    tasks: current.tasks.filter((t) => t.id !== taskId),
  }));
}

export async function handleTaskReorder(modeId: string, taskIds: string[]): Promise<void> {
  await updateStorage((current) => {
    const modeTasks = current.tasks.filter((t) => t.modeId === modeId && !t.archivedAt);
    if (modeTasks.length !== taskIds.length) {
      throw new FocusTabError('INTERNAL', 'タスク ID 一覧が不正です');
    }
    const tasks = current.tasks.map((t) => {
      if (t.modeId !== modeId || t.archivedAt) return t;
      const order = taskIds.indexOf(t.id);
      if (order === -1) throw new FocusTabError('INTERNAL', 'タスク ID 一覧が不正です');
      return { ...t, sortOrder: order, updatedAt: new Date().toISOString() };
    });
    return { ...current, tasks };
  });
}

export async function handleTaskArchive(taskId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateStorage((current) => {
    const index = current.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new FocusTabError('INTERNAL', 'タスクが見つかりません');
    const task = current.tasks[index];
    if (!task.completed) {
      throw new FocusTabError('INTERNAL', '完了済みタスクのみアーカイブできます');
    }
    if (task.archivedAt) {
      throw new FocusTabError('INTERNAL', 'すでにアーカイブ済みです');
    }
    const tasks = [...current.tasks];
    tasks[index] = taskSchema.parse({ ...task, archivedAt: now, updatedAt: now });
    return { ...current, tasks };
  });
}

export async function handleTaskUnarchive(taskId: string): Promise<void> {
  await updateStorage((current) => {
    const index = current.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) throw new FocusTabError('INTERNAL', 'タスクが見つかりません');
    const task = current.tasks[index];
    if (!task.archivedAt) {
      throw new FocusTabError('INTERNAL', 'アーカイブされていません');
    }
    const { archivedAt: _removed, ...rest } = task;
    const tasks = [...current.tasks];
    tasks[index] = taskSchema.parse({ ...rest, updatedAt: new Date().toISOString() });
    return { ...current, tasks };
  });
}

export async function handleTaskDeleteArchived(
  modeId: string,
): Promise<{ deletedCount: number }> {
  let deletedCount = 0;

  await updateStorage((current) => {
    if (!current.modes.some((m) => m.id === modeId)) {
      throw new FocusTabError('INVALID_MODE', 'モードが見つかりません');
    }

    const remaining = current.tasks.filter((t) => {
      if (t.modeId !== modeId || !t.archivedAt) return true;
      deletedCount += 1;
      return false;
    });

    if (deletedCount === 0) {
      return current;
    }

    return { ...current, tasks: remaining };
  });

  return { deletedCount };
}

export async function handleBookmarkCreate(
  modeId: string,
  url: string,
  title: string,
): Promise<Bookmark> {
  const now = new Date().toISOString();
  const bookmark = bookmarkSchema.parse({
    id: crypto.randomUUID(),
    modeId,
    url,
    title,
    sortOrder: 0,
    createdAt: now,
  });

  await updateStorage((current) => {
    if (!current.modes.some((m) => m.id === modeId)) {
      throw new FocusTabError('INVALID_MODE', 'モードが見つかりません');
    }
    if (countBookmarksForMode(current.bookmarks, modeId) >= MAX_BOOKMARKS_PER_MODE) {
      throw new FocusTabError('INTERNAL', `ブックマークはモードあたり最大 ${MAX_BOOKMARKS_PER_MODE} 件です`);
    }
    const maxOrder = current.bookmarks
      .filter((b) => b.modeId === modeId)
      .reduce((max, b) => Math.max(max, b.sortOrder), -1);
    return {
      ...current,
      bookmarks: [...current.bookmarks, { ...bookmark, sortOrder: maxOrder + 1 }],
    };
  });

  return bookmark;
}

export async function handleBookmarkUpdate(
  bookmarkId: string,
  patch: Partial<{ url: string; title: string; sortOrder: number }>,
): Promise<void> {
  await updateStorage((current) => {
    const index = current.bookmarks.findIndex((b) => b.id === bookmarkId);
    if (index === -1) throw new FocusTabError('INTERNAL', 'ブックマークが見つかりません');
    const bookmarks = [...current.bookmarks];
    bookmarks[index] = bookmarkSchema.parse({ ...bookmarks[index], ...patch });
    return { ...current, bookmarks };
  });
}

export async function handleBookmarkDelete(bookmarkId: string): Promise<void> {
  await updateStorage((current) => ({
    ...current,
    bookmarks: current.bookmarks.filter((b) => b.id !== bookmarkId),
  }));
}

export async function handleBookmarkReorder(
  modeId: string,
  bookmarkIds: string[],
): Promise<void> {
  await updateStorage((current) => {
    const modeBookmarks = current.bookmarks.filter((b) => b.modeId === modeId);
    if (modeBookmarks.length !== bookmarkIds.length) {
      throw new FocusTabError('INTERNAL', 'ブックマーク ID 一覧が不正です');
    }
    const bookmarks = current.bookmarks.map((b) => {
      if (b.modeId !== modeId) return b;
      const order = bookmarkIds.indexOf(b.id);
      if (order === -1) throw new FocusTabError('INTERNAL', 'ブックマーク ID 一覧が不正です');
      return { ...b, sortOrder: order };
    });
    return { ...current, bookmarks };
  });
}

export async function handleSettingsUpdate(
  patch: Partial<Settings>,
): Promise<void> {
  await updateStorage((current) => ({
    ...current,
    settings: settingsSchema.parse({ ...current.settings, ...patch }),
  }));
}

export async function handleExportData() {
  const data = await loadStorage();
  return {
    json: JSON.stringify(data, null, 2),
    exportedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export async function handleImportData(json: string, confirmed: boolean): Promise<void> {
  if (!confirmed) {
    throw new FocusTabError('CONFIRMATION_REQUIRED', 'インポートの確認が必要です');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new FocusTabError('INTERNAL', 'JSON の形式が不正です');
  }
  const data = storageSchema.parse(parsed);
  await updateStorage(() => data);
}

export {
  switchMode,
  createMode,
  updateMode,
  deleteMode,
  restoreDefaultModes,
  lockMode,
  unlockMode,
  emergencyUnlock,
  getRestoreProgress,
};
