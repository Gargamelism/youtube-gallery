import { 
  addOpacityToHexColor,
  OPACITY_LEVELS,
  withSubtleOpacity,
  withLightOpacity,
  withMediumOpacity,
  withStrongOpacity,
  withOpaqueOpacity
} from '../colorUtils';

describe('addOpacityToHexColor', () => {
  describe('basic functionality', () => {
    it('adds default 20% opacity to hex color', () => {
      expect(addOpacityToHexColor('#3B82F6')).toBe('#3B82F633');
    });

    it('adds custom opacity percentage', () => {
      expect(addOpacityToHexColor('#FF0000', 50)).toBe('#FF000080');
      expect(addOpacityToHexColor('#00FF00', 100)).toBe('#00FF00ff');
      expect(addOpacityToHexColor('#0000FF', 0)).toBe('#0000FF00');
    });

    it('handles single digit hex values correctly', () => {
      expect(addOpacityToHexColor('#000000', 4)).toBe('#0000000a');
      expect(addOpacityToHexColor('#FFFFFF', 6)).toBe('#FFFFFF0f');
    });
  });

  describe('edge cases', () => {
    it('handles lowercase hex colors', () => {
      expect(addOpacityToHexColor('#abc123', 25)).toBe('#abc12340');
    });

    it('handles uppercase hex colors', () => {
      expect(addOpacityToHexColor('#ABC123', 25)).toBe('#ABC12340');
    });

    it('handles extreme opacity values', () => {
      expect(addOpacityToHexColor('#123456', 1)).toBe('#12345603');
      expect(addOpacityToHexColor('#123456', 99)).toBe('#123456fc');
    });
  });

  describe('opacity calculations', () => {
    it('correctly converts percentages to hex', () => {
      // 20% = 0.2 * 255 = 51 = 0x33
      expect(addOpacityToHexColor('#000000', 20)).toBe('#00000033');
      
      // 50% = 0.5 * 255 = 127.5 ≈ 128 = 0x80
      expect(addOpacityToHexColor('#000000', 50)).toBe('#00000080');
      
      // 75% = 0.75 * 255 = 191.25 ≈ 191 = 0xBF
      expect(addOpacityToHexColor('#000000', 75)).toBe('#000000bf');
    });

    it('pads single digit hex with leading zero', () => {
      // 4% = 0.04 * 255 = 10.2 ≈ 10 = 0x0A
      expect(addOpacityToHexColor('#FFFFFF', 4)).toBe('#FFFFFF0a');
    });
  });
});

describe('OPACITY_LEVELS constants', () => {
  it('has correct predefined opacity values', () => {
    expect(OPACITY_LEVELS.SUBTLE).toBe(10);
    expect(OPACITY_LEVELS.LIGHT).toBe(20);
    expect(OPACITY_LEVELS.MEDIUM).toBe(40);
    expect(OPACITY_LEVELS.STRONG).toBe(60);
    expect(OPACITY_LEVELS.OPAQUE).toBe(80);
  });
});

describe('convenience opacity functions', () => {
  const testColor = '#3B82F6';

  it('withSubtleOpacity applies 10% opacity', () => {
    expect(withSubtleOpacity(testColor)).toBe('#3B82F61a'); // 10% = 26 = 0x1A
  });

  it('withLightOpacity applies 20% opacity', () => {
    expect(withLightOpacity(testColor)).toBe('#3B82F633'); // 20% = 51 = 0x33
  });

  it('withMediumOpacity applies 40% opacity', () => {
    expect(withMediumOpacity(testColor)).toBe('#3B82F666'); // 40% = 102 = 0x66
  });

  it('withStrongOpacity applies 60% opacity', () => {
    expect(withStrongOpacity(testColor)).toBe('#3B82F699'); // 60% = 153 = 0x99
  });

  it('withOpaqueOpacity applies 80% opacity', () => {
    expect(withOpaqueOpacity(testColor)).toBe('#3B82F6cc'); // 80% = 204 = 0xCC
  });
});

describe('integration tests', () => {
  it('convenience functions match direct calls with corresponding percentages', () => {
    const color = '#FF5733';
    
    expect(withSubtleOpacity(color)).toBe(addOpacityToHexColor(color, OPACITY_LEVELS.SUBTLE));
    expect(withLightOpacity(color)).toBe(addOpacityToHexColor(color, OPACITY_LEVELS.LIGHT));
    expect(withMediumOpacity(color)).toBe(addOpacityToHexColor(color, OPACITY_LEVELS.MEDIUM));
    expect(withStrongOpacity(color)).toBe(addOpacityToHexColor(color, OPACITY_LEVELS.STRONG));
    expect(withOpaqueOpacity(color)).toBe(addOpacityToHexColor(color, OPACITY_LEVELS.OPAQUE));
  });

  it('works with real Tailwind CSS color values', () => {
    // Common Tailwind colors
    expect(withLightOpacity('#EF4444')).toBe('#EF444433'); // red-500
    expect(withMediumOpacity('#3B82F6')).toBe('#3B82F666'); // blue-500
    expect(withStrongOpacity('#10B981')).toBe('#10B98199'); // emerald-500
  });
});