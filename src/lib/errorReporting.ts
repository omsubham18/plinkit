// src/lib/errorReporting.ts
// Telemetry & Error capture into public.client_errors per docs/SPEC.md.
// Strictly strips personal data (phones, emails, rooms) and truncates to <= 500 characters.

import { supabase } from '@/lib/supabase';

const recentErrors = new Set<string>();

/**
 * Sanitizes an error message by scrubbing personal identifiable information (PII)
 * such as Indian mobile numbers, email addresses, and room numbers.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage) return 'Unknown error';

  let cleaned = String(rawMessage);

  // 1. Redact Email addresses
  cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/gi, '[EMAIL]');

  // 2. Redact Indian mobile numbers (+91-XXXXX-XXXXX, 9876543210, etc.)
  cleaned = cleaned.replace(/(?:\+91[-\s]?)?[6-9]\d{9}\b/g, '[PHONE]');
  cleaned = cleaned.replace(/\b\d{5}[-\s]?\d{5}\b/g, '[PHONE]');

  // 3. Redact explicit room or hostel numbers if labeled
  cleaned = cleaned.replace(/(?:room|flat|hostel\s*room)[\s:#]+[A-Za-z0-9-]+/gi, 'room [REDACTED]');

  // 4. Truncate strictly to <= 500 characters to comply with PostgreSQL check constraint
  if (cleaned.length > 500) {
    cleaned = cleaned.slice(0, 497) + '...';
  }

  return cleaned.trim();
}

/**
 * Asynchronously captures and records an error into public.client_errors table.
 * Never throws or disrupts user interaction.
 */
export async function captureClientError(
  error: unknown,
  customRoute?: string
): Promise<void> {
  try {
    let rawMsg = 'Unknown error';
    if (typeof error === 'string') {
      rawMsg = error;
    } else if (error instanceof Error) {
      rawMsg = error.stack || error.message;
    } else if (typeof error === 'object' && error !== null) {
      rawMsg = JSON.stringify(error);
    }

    const sanitizedMsg = sanitizeErrorMessage(rawMsg);
    const currentRoute = customRoute || (typeof window !== 'undefined' ? window.location.pathname : '/');

    // Deduplicate identical error on the same route within short window
    const dedupKey = `${currentRoute}:${sanitizedMsg.slice(0, 80)}`;
    if (recentErrors.has(dedupKey)) {
      return;
    }
    recentErrors.add(dedupKey);
    setTimeout(() => recentErrors.delete(dedupKey), 5000);

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : null;

    // Get current user id safely without throwing
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch {
      // Ignored
    }

    // Insert into client_errors table (insert-only table open to all users)
    await supabase.from('client_errors').insert({
      message: sanitizedMsg,
      route: currentRoute.slice(0, 100),
      user_agent: userAgent,
      user_id: userId,
    });
  } catch {
    // Fail silently so error reporting never causes secondary crashes
  }
}

/**
 * Installs global error listeners for unhandled window errors and unhandled promise rejections.
 */
export function setupGlobalErrorCapture(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleGlobalError = (event: ErrorEvent) => {
    captureClientError(event.error || event.message);
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    captureClientError(event.reason || 'Unhandled Promise Rejection');
  };

  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}
