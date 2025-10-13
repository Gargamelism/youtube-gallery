/**
 * Checks if text contains Hebrew characters
 * @param text - Text to check for Hebrew characters
 * @returns True if text contains Hebrew characters
 */
export function isHebrew(text: string | null): boolean {
  if (!text) return false;
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
}

/**
 * Gets the appropriate text direction for RTL/LTR languages
 * @param text - Text to determine direction for
 * @returns 'rtl' for Hebrew text, 'ltr' for other languages
 */
export function getTextDirection(text: string | null): 'rtl' | 'ltr' {
  return isHebrew(text) ? 'rtl' : 'ltr';
}

/**
 * Gets the appropriate Tailwind CSS text alignment class
 * @param text - Text to determine alignment for
 * @returns 'text-right' for Hebrew text, 'text-left' for other languages
 */
export function getTextAlign(text: string | null): 'text-right' | 'text-left' {
  return isHebrew(text) ? 'text-right' : 'text-left';
}