// src/lib/logger.ts
// Structured logger (pino) for all server-side code.
// Pretty-prints in development, emits JSON in production.
// Usage: import { logger } from '@/lib/logger'
//        logger.info('msg')
//        logger.error({ err, context }, 'msg')
//        logger.child({ module: 'OrchestratorChatEngine' }).info('msg')

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      '*.apiKey',
      '*.token',
      '*.secret',
      '*.password',
      '*.authorization',
      '*.cookie',
      'OPENROUTER_API_KEY',
      'DATABASE_URL'
    ],
    censor: '[REDACTED]',
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
});

// Module-scoped child loggers — avoids repeating { module } on every call
export const loggers = {
  api:           logger.child({ module: 'api' }),
  orchestrator:  logger.child({ module: 'orchestrator' }),
  agentRuntime:  logger.child({ module: 'agent-runtime' }),
  eventBus:      logger.child({ module: 'event-bus' }),
  toolHub:       logger.child({ module: 'tool-hub' }),
  memory:        logger.child({ module: 'memory' }),
  browser:       logger.child({ module: 'browser-operator' }),
  rateLimit:     logger.child({ module: 'rate-limit' }),
  seed:          logger.child({ module: 'seed' }),
  pixel:         logger.child({ module: 'pixel-office' }),
};
