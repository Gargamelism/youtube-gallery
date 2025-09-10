/**
 * Color utility functions for consistent color manipulation across the app
 */

/**
 * Adds opacity to a hex color by appending an alpha channel
 * 
 * @param hexColor - Base hex color (e.g., "#3B82F6")
 * @param opacityPercent - Opacity as percentage (0-100, default: 20)
 * @returns Hex color with alpha channel (e.g., "#3B82F633")
 * 
 * @example
 * addOpacityToHexColor("#3B82F6", 20) // "#3B82F633" (20% opacity)
 * addOpacityToHexColor("#FF0000", 50) // "#FF000080" (50% opacity)
 */
export function addOpacityToHexColor(hexColor: string, opacityPercent: number = 20): string {
  // Convert percentage to decimal (20% -> 0.2)
  const opacityDecimal = opacityPercent / 100;
  
  // Convert to 0-255 range (0.2 -> 51)
  const opacityValue = Math.round(opacityDecimal * 255);
  
  // Convert to hexadecimal (51 -> "33")
  const opacityHex = opacityValue.toString(16);
  
  // Ensure 2 digits with leading zero if needed ("a" -> "0a")
  const paddedOpacityHex = opacityHex.padStart(2, '0');
  
  // Combine base color with opacity
  return hexColor + paddedOpacityHex;
}

/**
 * Common opacity levels for consistent UI
 */
export const OPACITY_LEVELS = {
  SUBTLE: 10,      // Very light tint
  LIGHT: 20,       // Light background
  MEDIUM: 40,      // Borders, hover states
  STRONG: 60,      // More visible elements
  OPAQUE: 80,      // Nearly solid
} as const;

/**
 * Convenience functions for common opacity levels
 */
export const withSubtleOpacity = (hexColor: string) => addOpacityToHexColor(hexColor, OPACITY_LEVELS.SUBTLE);
export const withLightOpacity = (hexColor: string) => addOpacityToHexColor(hexColor, OPACITY_LEVELS.LIGHT);
export const withMediumOpacity = (hexColor: string) => addOpacityToHexColor(hexColor, OPACITY_LEVELS.MEDIUM);
export const withStrongOpacity = (hexColor: string) => addOpacityToHexColor(hexColor, OPACITY_LEVELS.STRONG);
export const withOpaqueOpacity = (hexColor: string) => addOpacityToHexColor(hexColor, OPACITY_LEVELS.OPAQUE);