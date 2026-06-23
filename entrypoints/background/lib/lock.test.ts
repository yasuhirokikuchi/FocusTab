import { describe, expect, it } from 'vitest';
import { PENALTY_TEXT } from '@/shared/constants';
import { verifyEmergencyUnlock } from './lock';

describe('verifyEmergencyUnlock', () => {
  it('固定文と完全一致で true', async () => {
    await expect(verifyEmergencyUnlock(PENALTY_TEXT)).resolves.toBe(true);
  });

  it('不一致は false', async () => {
    await expect(verifyEmergencyUnlock('違う文')).resolves.toBe(false);
    await expect(verifyEmergencyUnlock('')).resolves.toBe(false);
  });
});
