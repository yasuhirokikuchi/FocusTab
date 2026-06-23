import { beforeEach, vi } from 'vitest';
import { clearStorageMock, installChromeMocks } from './helpers/chrome-mock';

installChromeMocks();

beforeEach(() => {
  clearStorageMock();
});
