/**
 * Generates a random color from a predefined palette suitable for tags
 * @returns A hex color string
 */
export function getRandomTagColor(): string {
  const colors = [
    '#EF4444', // red-500
    '#F97316', // orange-500
    '#F59E0B', // amber-500
    '#EAB308', // yellow-500
    '#84CC16', // lime-500
    '#22C55E', // green-500
    '#10B981', // emerald-500
    '#14B8A6', // teal-500
    '#06B6D4', // cyan-500
    '#0EA5E9', // sky-500
    '#3B82F6', // blue-500
    '#6366F1', // indigo-500
    '#8B5CF6', // violet-500
    '#A855F7', // purple-500
    '#D946EF', // fuchsia-500
    '#EC4899', // pink-500
    '#F43F5E', // rose-500
    '#64748B', // slate-500
    '#6B7280', // gray-500
    '#374151', // gray-700
  ];

  // eslint-disable-next-line security-node/detect-insecure-randomness
  return colors[Math.floor(Math.random() * colors.length)]!;
}

/**
 * Validates if a color string is a valid hex color
 * @param color - Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}