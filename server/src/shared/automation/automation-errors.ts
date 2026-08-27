import { AppError } from '../errors/AppError';

export class AutomationValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'AUTOMATION_VALIDATION_ERROR', message, details);
  }
}

export class AutomationSkippedError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(409, code, message, details);
  }
}

export const sanitizeAutomationError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Automation action failed.';
  return message
    .replace(/(?:password|token|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 1000);
};
