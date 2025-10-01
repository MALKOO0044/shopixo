import crypto from 'crypto';

export type Logger = {
  requestId: string;
  info: (msg: string, meta?: Record<string, any>) => void;
  warn: (msg: string, meta?: Record<string, any>) => void;
  error: (msg: string, meta?: Record<string, any>) => void;
};

export function getRequestIdFromHeaders(h: Headers | null | undefined): string | null {
  if (!h) return null;
  return (
    h.get('x-request-id') ||
    h.get('x-correlation-id') ||
    h.get('cf-ray') ||
    h.get('x-vercel-id') ||
    null
  );
}

export function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function loggerForRequest(req?: Request): Logger {
  const fromHeader = getRequestIdFromHeaders(req?.headers);
  const requestId = fromHeader || newRequestId();

  function base(level: 'INFO'|'WARN'|'ERROR', msg: string, meta?: Record<string, any>) {
    const line = {
      level,
      requestId,
      msg,
      ...(meta || {}),
    };
    // eslint-disable-next-line no-console
    if (level === 'ERROR') console.error(JSON.stringify(line));
    else if (level === 'WARN') console.warn(JSON.stringify(line));
    else console.log(JSON.stringify(line));
  }

  return {
    requestId,
    info: (m, meta) => base('INFO', m, meta),
    warn: (m, meta) => base('WARN', m, meta),
    error: (m, meta) => base('ERROR', m, meta),
  };
}
