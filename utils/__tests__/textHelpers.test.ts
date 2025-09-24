import { isHebrew, getTextDirection, getTextAlign } from '../textHelpers';

describe('isHebrew', () => {
  describe('Hebrew text detection', () => {
    const hebrewTestCases = [
      'שלום',
      'עברית',
      'ישראל',
      'אבגדהוזחטיכלמנסעפצקרשת',
      'Hello שלום',
      '123 עברית',
      'שלום World!',
      'תיאור Video',
      'שלום, עולם!',
      'עברית 2024',
      'הערוץ של דני - פרק 5',
    ];

    test.each(hebrewTestCases)('detects Hebrew in "%s"', (text) => {
      expect(isHebrew(text)).toBe(true);
    });
  });

  describe('non-Hebrew text detection', () => {
    const nonHebrewTestCases = [
      'Hello World',
      'English text',
      'YouTube Video',
      '123456',
      '!@#$%^&*()',
      '2024-01-01',
      'Bonjour le monde', // French
      'Hola mundo', // Spanish
      'مرحبا بالعالم', // Arabic
      'こんにちは世界', // Japanese
      'Привет мир', // Russian
    ];

    test.each(nonHebrewTestCases)('returns false for non-Hebrew text "%s"', (text) => {
      expect(isHebrew(text)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles null input', () => {
      expect(isHebrew(null)).toBe(false);
    });

    it('handles empty string', () => {
      expect(isHebrew('')).toBe(false);
    });

    it('handles whitespace only', () => {
      expect(isHebrew('   ')).toBe(false);
      expect(isHebrew('\n\t')).toBe(false);
    });

    it('handles single Hebrew character', () => {
      expect(isHebrew('א')).toBe(true);
      expect(isHebrew('ת')).toBe(true);
    });
  });

  describe('Hebrew Unicode ranges', () => {
    it('detects Hebrew characters from Unicode block U+0590-U+05FF', () => {
      // Hebrew punctuation and points
      expect(isHebrew('\u0591')).toBe(true); // Hebrew accent
      expect(isHebrew('\u05B0')).toBe(true); // Hebrew point
      expect(isHebrew('\u05D0')).toBe(true); // Hebrew letter Alef
      expect(isHebrew('\u05EA')).toBe(true); // Hebrew letter Tav
      expect(isHebrew('\u05F0')).toBe(true); // Hebrew ligature
    });

    it('does not detect characters outside Hebrew range', () => {
      expect(isHebrew('\u058F')).toBe(false); // Before Hebrew range
      expect(isHebrew('\u0600')).toBe(false); // After Hebrew range (Arabic)
    });
  });
});

describe('getTextDirection', () => {
  describe('RTL for Hebrew text', () => {
    it('returns rtl for Hebrew text', () => {
      expect(getTextDirection('שלום עולם')).toBe('rtl');
      expect(getTextDirection('הזמנה לאירוע')).toBe('rtl');
      expect(getTextDirection('ערוץ יוטיוב בעברית')).toBe('rtl');
    });

    it('returns rtl for mixed Hebrew text', () => {
      expect(getTextDirection('Hello שלום')).toBe('rtl');
      expect(getTextDirection('YouTube בעברית')).toBe('rtl');
      expect(getTextDirection('2024 שנה טובה')).toBe('rtl');
    });
  });

  describe('LTR for non-Hebrew text', () => {
    it('returns ltr for English text', () => {
      expect(getTextDirection('Hello World')).toBe('ltr');
      expect(getTextDirection('English Video Title')).toBe('ltr');
      expect(getTextDirection('YouTube Channel')).toBe('ltr');
    });

    it('returns ltr for other languages', () => {
      expect(getTextDirection('Bonjour')).toBe('ltr');
      expect(getTextDirection('Hola')).toBe('ltr');
      expect(getTextDirection('مرحبا')).toBe('ltr'); // Arabic (not Hebrew)
    });

    it('returns ltr for numbers and symbols', () => {
      expect(getTextDirection('123456')).toBe('ltr');
      expect(getTextDirection('Video #5')).toBe('ltr');
      expect(getTextDirection('2024-01-01')).toBe('ltr');
    });
  });

  describe('edge cases', () => {
    it('returns ltr for null input', () => {
      expect(getTextDirection(null)).toBe('ltr');
    });

    it('returns ltr for empty string', () => {
      expect(getTextDirection('')).toBe('ltr');
    });

    it('returns ltr for whitespace only', () => {
      expect(getTextDirection('   ')).toBe('ltr');
    });
  });
});

describe('getTextAlign', () => {
  describe('right alignment for Hebrew text', () => {
    it('returns text-right for Hebrew text', () => {
      expect(getTextAlign('שלום עולם')).toBe('text-right');
      expect(getTextAlign('הזמנה לאירוע')).toBe('text-right');
      expect(getTextAlign('ערוץ יוטיוב בעברית')).toBe('text-right');
    });

    it('returns text-right for mixed Hebrew text', () => {
      expect(getTextAlign('Hello שלום')).toBe('text-right');
      expect(getTextAlign('YouTube בעברית')).toBe('text-right');
      expect(getTextAlign('2024 שנה טובה')).toBe('text-right');
    });
  });

  describe('left alignment for non-Hebrew text', () => {
    it('returns text-left for English text', () => {
      expect(getTextAlign('Hello World')).toBe('text-left');
      expect(getTextAlign('English Video Title')).toBe('text-left');
      expect(getTextAlign('YouTube Channel')).toBe('text-left');
    });

    it('returns text-left for other languages', () => {
      expect(getTextAlign('Bonjour')).toBe('text-left');
      expect(getTextAlign('Hola')).toBe('text-left');
      expect(getTextAlign('مرحبا')).toBe('text-left'); // Arabic (not Hebrew)
    });

    it('returns text-left for numbers and symbols', () => {
      expect(getTextAlign('123456')).toBe('text-left');
      expect(getTextAlign('Video #5')).toBe('text-left');
      expect(getTextAlign('2024-01-01')).toBe('text-left');
    });
  });

  describe('edge cases', () => {
    it('returns text-left for null input', () => {
      expect(getTextAlign(null)).toBe('text-left');
    });

    it('returns text-left for empty string', () => {
      expect(getTextAlign('')).toBe('text-left');
    });

    it('returns text-left for whitespace only', () => {
      expect(getTextAlign('   ')).toBe('text-left');
    });
  });
});

describe('integration tests', () => {
  describe('consistent behavior across functions', () => {
    const testCases = [
      { text: 'שלום עולם', expectedHebrew: true, expectedDirection: 'rtl', expectedAlign: 'text-right' },
      { text: 'Hello World', expectedHebrew: false, expectedDirection: 'ltr', expectedAlign: 'text-left' },
      { text: 'Hello שלום', expectedHebrew: true, expectedDirection: 'rtl', expectedAlign: 'text-right' },
      { text: '123456', expectedHebrew: false, expectedDirection: 'ltr', expectedAlign: 'text-left' },
      { text: null, expectedHebrew: false, expectedDirection: 'ltr', expectedAlign: 'text-left' },
      { text: '', expectedHebrew: false, expectedDirection: 'ltr', expectedAlign: 'text-left' },
    ];

    test.each(testCases)('handles "$text" consistently across all functions', ({ text, expectedHebrew, expectedDirection, expectedAlign }) => {
      expect(isHebrew(text)).toBe(expectedHebrew);
      expect(getTextDirection(text)).toBe(expectedDirection);
      expect(getTextAlign(text)).toBe(expectedAlign);
    });
  });

  describe('real-world YouTube scenarios', () => {
    it('handles typical YouTube video titles', () => {
      // Hebrew video title
      const hebrewTitle = 'מדריך לצילום מקצועי - חלק 1';
      expect(isHebrew(hebrewTitle)).toBe(true);
      expect(getTextDirection(hebrewTitle)).toBe('rtl');
      expect(getTextAlign(hebrewTitle)).toBe('text-right');

      // English video title
      const englishTitle = 'Professional Photography Tutorial - Part 1';
      expect(isHebrew(englishTitle)).toBe(false);
      expect(getTextDirection(englishTitle)).toBe('ltr');
      expect(getTextAlign(englishTitle)).toBe('text-left');

      // Mixed language title
      const mixedTitle = 'React Tutorial בעברית';
      expect(isHebrew(mixedTitle)).toBe(true);
      expect(getTextDirection(mixedTitle)).toBe('rtl');
      expect(getTextAlign(mixedTitle)).toBe('text-right');
    });

    it('handles channel names and descriptions', () => {
      const hebrewChannel = 'ערוץ הטכנולוגיה של דני';
      expect(getTextDirection(hebrewChannel)).toBe('rtl');
      expect(getTextAlign(hebrewChannel)).toBe('text-right');

      const englishChannel = 'Tech Channel by Danny';
      expect(getTextDirection(englishChannel)).toBe('ltr');
      expect(getTextAlign(englishChannel)).toBe('text-left');
    });
  });
});