import type { IncomingMessage } from '@/shared/messages';
import { getDnrRuleStats } from './blocking';
import { isFocusTabError, toMessageError } from './errors';
import {
  buildAppState,
  createMode,
  deleteMode,
  emergencyUnlock,
  getRestoreProgress,
  handleBookmarkCreate,
  handleBookmarkDelete,
  handleBookmarkReorder,
  handleBookmarkUpdate,
  handleExportData,
  handleImportData,
  handleSettingsUpdate,
  handleTaskCreate,
  handleTaskDelete,
  handleTaskReorder,
  handleTaskArchive,
  handleTaskUnarchive,
  handleTaskToggle,
  handleTaskUpdate,
  lockMode,
  restoreDefaultModes,
  switchMode,
  unlockMode,
  updateMode,
} from './handlers';

export interface DispatchContext {
  senderTabId?: number;
}

export async function dispatchMessage(
  message: IncomingMessage,
  ctx?: DispatchContext,
): Promise<unknown> {
  try {
    switch (message.type) {
      case 'PING':
        return { phase: 4 };

      case 'GET_STATE':
        return buildAppState();

      case 'MODE_SWITCH':
        return switchMode(message.targetModeId, {
          confirmed: message.confirmed,
          senderTabId: ctx?.senderTabId,
        });

      case 'MODE_CREATE':
        return createMode(message.mode);

      case 'MODE_UPDATE':
        return updateMode(message.modeId, message.patch);

      case 'MODE_DELETE':
        await deleteMode(message.modeId);
        return undefined;

      case 'MODE_RESTORE_DEFAULTS':
        await restoreDefaultModes(message.confirmed);
        return undefined;

      case 'LOCK_MODE':
        return lockMode(message.durationMinutes);

      case 'UNLOCK_MODE':
        await unlockMode();
        return undefined;

      case 'EMERGENCY_UNLOCK':
        await emergencyUnlock(message.penaltyText);
        return undefined;

      case 'TASK_CREATE':
        return handleTaskCreate(message.modeId, message.text);

      case 'TASK_UPDATE':
        await handleTaskUpdate(message.taskId, message.patch);
        return undefined;

      case 'TASK_TOGGLE':
        await handleTaskToggle(message.taskId);
        return undefined;

      case 'TASK_DELETE':
        await handleTaskDelete(message.taskId);
        return undefined;

      case 'TASK_REORDER':
        await handleTaskReorder(message.modeId, message.taskIds);
        return undefined;

      case 'TASK_ARCHIVE':
        await handleTaskArchive(message.taskId);
        return undefined;

      case 'TASK_UNARCHIVE':
        await handleTaskUnarchive(message.taskId);
        return undefined;

      case 'BOOKMARK_CREATE':
        return handleBookmarkCreate(message.modeId, message.url, message.title);

      case 'BOOKMARK_UPDATE':
        await handleBookmarkUpdate(message.bookmarkId, message.patch);
        return undefined;

      case 'BOOKMARK_DELETE':
        await handleBookmarkDelete(message.bookmarkId);
        return undefined;

      case 'BOOKMARK_REORDER':
        await handleBookmarkReorder(message.modeId, message.bookmarkIds);
        return undefined;

      case 'SETTINGS_UPDATE':
        await handleSettingsUpdate(message.patch);
        return undefined;

      case 'EXPORT_DATA':
        return handleExportData();

      case 'IMPORT_DATA':
        await handleImportData(message.json, message.confirmed);
        return undefined;

      case 'GET_DNR_STATS':
        return getDnrRuleStats();

      case 'GET_RESTORE_PROGRESS':
        return getRestoreProgress(message.jobId);

      default: {
        const _exhaustive: never = message;
        throw new Error(`未対応: ${(_exhaustive as IncomingMessage).type}`);
      }
    }
  } catch (err) {
    if (isFocusTabError(err)) throw err;
    throw err;
  }
}

export { toMessageError, isFocusTabError };
