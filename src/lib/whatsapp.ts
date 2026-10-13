/**
 * Generates a clean WhatsApp click-to-chat URL with prefilled order number.
 * Formats Indian phone numbers with country code 91 if omitted.
 */
export function getWhatsAppOrderSupportUrl(
  phone: string,
  orderNo: number | string
): string {
  // Strip non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If 10 digits (standard Indian mobile), prepend 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  const message = `Hi, I need help with my order #${orderNo}`;
  const encodedMessage = encodeURIComponent(message);

  if (!digits) {
    // Fallback if no phone configured
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${digits}?text=${encodedMessage}`;
}
