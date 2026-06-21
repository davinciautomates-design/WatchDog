import pino from 'pino'

/**
 * Structured JSON logger (pino).
 *
 * In development, pino-pretty formats output for readability.
 * In production, plain JSON is emitted — consumed by log aggregators (Datadog, Loki, etc.).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }
    : {}),
})
