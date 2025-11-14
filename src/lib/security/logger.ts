/**
 * Security Logging Utility
 *
 * Provides comprehensive logging for security events, API requests,
 * and suspicious activity. In production, these logs should be sent
 * to a proper logging service.
 */

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  SECURITY = "SECURITY",
}

export enum SecurityEventType {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  LOGOUT = "LOGOUT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INVALID_TOKEN = "INVALID_TOKEN",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  SUSPICIOUS_INPUT = "SUSPICIOUS_INPUT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SQL_INJECTION_ATTEMPT = "SQL_INJECTION_ATTEMPT",
  XSS_ATTEMPT = "XSS_ATTEMPT",
  API_ERROR = "API_ERROR",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  eventType?: SecurityEventType;
  message: string;
  metadata?: Record<string, unknown>;
  clientId?: string;
  endpoint?: string;
  statusCode?: number;
}

/**
 * Log a security event
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.SECURITY,
    eventType,
    message,
    metadata: sanitizeMetadata(metadata),
  };

  // In production, send to logging service (e.g., Datadog, Sentry, CloudWatch)
  console.log(JSON.stringify(logEntry));

  // Alert on critical security events
  if (isCriticalEvent(eventType)) {
    alertSecurityTeam(logEntry);
  }
}

/**
 * Log an API request
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  clientId: string,
  statusCode: number,
  duration?: number,
  metadata?: Record<string, unknown>
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.INFO,
    message: `${method} ${endpoint}`,
    clientId,
    endpoint,
    statusCode,
    metadata: {
      ...sanitizeMetadata(metadata),
      duration,
    },
  };

  console.log(JSON.stringify(logEntry));
}

/**
 * Log a validation error
 */
export function logValidationError(
  endpoint: string,
  clientId: string,
  error: string,
  input?: unknown
): void {
  logSecurityEvent(SecurityEventType.VALIDATION_ERROR, error, {
    endpoint,
    clientId,
    input: sanitizeInput(input),
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(
  type: SecurityEventType,
  message: string,
  clientId: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent(type, message, {
    clientId,
    ...details,
  });
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(
  endpoint: string,
  clientId: string,
  limit: number
): void {
  logSecurityEvent(
    SecurityEventType.RATE_LIMIT_EXCEEDED,
    `Rate limit exceeded for ${endpoint}`,
    {
      endpoint,
      clientId,
      limit,
    }
  );
}

/**
 * Log authentication failure
 */
export function logAuthFailure(
  username: string,
  clientId: string,
  reason: string
): void {
  logSecurityEvent(SecurityEventType.LOGIN_FAILURE, reason, {
    username,
    clientId,
  });
}

/**
 * Log authentication success
 */
export function logAuthSuccess(username: string, clientId: string): void {
  logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, "Admin login successful", {
    username,
    clientId,
  });
}

/**
 * Sanitize metadata to remove sensitive information
 */
function sanitizeMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const sanitized = { ...metadata };
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "authorization",
    "cookie",
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Sanitize input data for logging
 */
function sanitizeInput(input: unknown): unknown {
  if (typeof input === "string") {
    // Limit string length
    return input.length > 500 ? input.slice(0, 500) + "..." : input;
  }

  if (typeof input === "object" && input !== null) {
    return sanitizeMetadata(input as Record<string, unknown>);
  }

  return input;
}

/**
 * Check if an event is critical and requires immediate attention
 */
function isCriticalEvent(eventType: SecurityEventType): boolean {
  const criticalEvents = [
    SecurityEventType.SQL_INJECTION_ATTEMPT,
    SecurityEventType.XSS_ATTEMPT,
    SecurityEventType.UNAUTHORIZED_ACCESS,
  ];

  return criticalEvents.includes(eventType);
}

/**
 * Alert security team about critical events
 * In production, this should send alerts via email, Slack, PagerDuty, etc.
 */
function alertSecurityTeam(logEntry: LogEntry): void {
  // In production, integrate with alerting service
  console.error("⚠️  CRITICAL SECURITY EVENT:", JSON.stringify(logEntry));
}

/**
 * Create a request logger middleware
 */
export function createRequestLogger() {
  const requests = new Map<string, number>();

  return {
    logRequest: (
      method: string,
      endpoint: string,
      clientId: string,
      startTime: number
    ) => {
      const requestId = `${method}-${endpoint}-${Date.now()}`;
      requests.set(requestId, startTime);
      return requestId;
    },

    logResponse: (
      requestId: string,
      method: string,
      endpoint: string,
      clientId: string,
      statusCode: number
    ) => {
      const startTime = requests.get(requestId);
      const duration = startTime ? Date.now() - startTime : undefined;
      requests.delete(requestId);

      logApiRequest(method, endpoint, clientId, statusCode, duration);
    },
  };
}
