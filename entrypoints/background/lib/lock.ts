import { ALARM_NAMES, LOCK_DURATION_MAX, LOCK_DURATION_MIN, PENALTY_TEXT } from '@/shared/constants';
import { FocusTabError } from './errors';
import type { LockState } from '@/shared/schemas';
import { lockStateSchema } from '@/shared/schemas';
import { loadStorage, patchStorage } from './state';

export async function isLocked(): Promise<boolean> {
  const data = await loadStorage();
  if (!data.lockState) return false;
  return new Date(data.lockState.expiresAt).getTime() > Date.now();
}

export async function lockMode(durationMinutes: number): Promise<LockState> {
  if (durationMinutes < LOCK_DURATION_MIN || durationMinutes > LOCK_DURATION_MAX) {
    throw new FocusTabError('INTERNAL', `ロック時間は ${LOCK_DURATION_MIN}〜${LOCK_DURATION_MAX} 分です`);
  }

  const data = await loadStorage();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60_000);

  const lockState = lockStateSchema.parse({
    lockedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    durationMinutes,
    modeIdAtLock: data.activeModeId,
  });

  await chrome.alarms.clear(ALARM_NAMES.MODE_LOCK_EXPIRY);
  await chrome.alarms.create(ALARM_NAMES.MODE_LOCK_EXPIRY, {
    when: expiresAt.getTime(),
  });

  await patchStorage({ lockState });
  return lockState;
}

export async function unlockMode(): Promise<void> {
  await chrome.alarms.clear(ALARM_NAMES.MODE_LOCK_EXPIRY);
  await patchStorage({ lockState: null });
}

export async function verifyEmergencyUnlock(penaltyText: string): Promise<boolean> {
  return penaltyText === PENALTY_TEXT;
}

export async function emergencyUnlock(penaltyText: string): Promise<void> {
  if (!(await verifyEmergencyUnlock(penaltyText))) {
    throw new FocusTabError('PENALTY_FAILED', '解除文が一致しません');
  }
  await unlockMode();
}

export async function restoreLockFromAlarms(): Promise<void> {
  const alarms = await chrome.alarms.getAll();
  const lockAlarm = alarms.find((a) => a.name === ALARM_NAMES.MODE_LOCK_EXPIRY);

  const data = await loadStorage();
  if (!data.lockState) return;

  if (!lockAlarm || (lockAlarm.scheduledTime ?? 0) <= Date.now()) {
    await patchStorage({ lockState: null });
    return;
  }

  if (new Date(data.lockState.expiresAt).getTime() <= Date.now()) {
    await patchStorage({ lockState: null });
  }
}

export function initLockAlarmListener(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAMES.MODE_LOCK_EXPIRY) {
      void patchStorage({ lockState: null });
    }
  });
}

export async function assertNotLocked(): Promise<void> {
  if (await isLocked()) {
    throw new FocusTabError('LOCKED', 'モードロック中のため切替できません');
  }
}
