import { CodexSubscriptionProvider } from './provider';

const globalCodex = globalThis as typeof globalThis & {
  __jarvisCodexSubscriptionProvider?: CodexSubscriptionProvider;
};

export const codexSubscriptionProvider =
  globalCodex.__jarvisCodexSubscriptionProvider ?? new CodexSubscriptionProvider();

if (process.env.NODE_ENV !== 'production') {
  globalCodex.__jarvisCodexSubscriptionProvider = codexSubscriptionProvider;
}

export * from './types';
export * from './path-policy';
export * from './redaction';
export * from './trusted-local';
