import { expect, test, describe, vi, beforeEach } from 'vitest';
import { PathGuard } from './path-guard';
import path from 'path';
import fs from 'fs';

// Mock config
vi.mock('../config', () => ({
  DaemonConfig: {
    WORKSPACES_ROOT: 'C:\\mock_test_root\\workspaces',
    ARTIFACTS_ROOT: 'C:\\mock_test_root\\artifacts',
    LOGS_ROOT: 'C:\\mock_test_root\\logs',
    TEMP_ROOT: 'C:\\mock_test_root\\temp',
  }
}));

describe('PathGuard Sandbox', () => {
  const artifactsRoot = 'C:\\mock_test_root\\artifacts';

  beforeEach(() => {
    if (!fs.existsSync(artifactsRoot)) {
      fs.mkdirSync(artifactsRoot, { recursive: true });
    }
  });

  test('allows safe artifact paths', () => {
    const safePath = path.join(artifactsRoot, 'test.txt');
    expect(PathGuard.isSafePath(safePath)).toBe(true);
  });

  test('blocks path traversal outside root', () => {
    const unsafePath = path.join(artifactsRoot, '..', 'secrets.txt');
    expect(PathGuard.isSafePath(unsafePath)).toBe(false);
  });

  test('blocks Windows UNC paths', () => {
    expect(PathGuard.isSafePath('\\\\Server\\Share\\test.txt')).toBe(false);
  });

  test('blocks arbitrary C: drive paths', () => {
    expect(PathGuard.isSafePath('C:\\Windows\\System32\\cmd.exe')).toBe(false);
  });
});
