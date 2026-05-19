/**
 * Minimal response helpers — consistent JSON shape matching NestJS HttpException.
 */

/** Successful JSON response */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * Error JSON response — shape mirrors NestJS HttpException so clients
 * can handle edge errors identically to origin errors.
 */
export function error(message: string, status: number, requestId?: string): Response {
  const body: Record<string, unknown> = {
    statusCode: status,
    error: HTTP_STATUS_TEXT[status] ?? 'Error',
    message,
  };
  if (requestId) body['requestId'] = requestId;

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'no-store',
      ...(requestId ? { 'x-request-id': requestId } : {}),
    },
  });
}

const HTTP_STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};
