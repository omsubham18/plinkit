/**
 * Detects in-app browsers (Instagram, Facebook, Messenger, Twitter/X, TikTok, WeChat, etc.)
 * where Google OAuth is blocked due to Google's disallowed_useragent security policy.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }

  const ua = window.navigator.userAgent || window.navigator.vendor || '';

  // Common identifiers for WebViews and in-app browsers
  const inAppPatterns = [
    /FBAN/i,
    /FBAV/i,
    /Instagram/i,
    /Twitter/i,
    /Snapchat/i,
    /Line/i,
    /MicroMessenger/i, // WeChat
    /musical_ly/i,    // TikTok
    /ByteLocale/i,    // TikTok
    /LinkedIn/i,
    /Pinterest/i,
  ];

  return inAppPatterns.some((pattern) => pattern.test(ua));
}

/**
 * Copies the current URL to the clipboard with fallback for older environments.
 */
export async function copyCurrentUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const url = window.location.href;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    // Fallback using textarea execCommand
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    textArea.remove();
    return success;
  } catch (err) {
    console.error('Failed to copy current URL:', err);
    return false;
  }
}
