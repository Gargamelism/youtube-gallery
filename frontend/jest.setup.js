import '@testing-library/jest-dom';

global.fetch = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => key,
    i18n: { changeLanguage: jest.fn() },
  }),
}));

beforeEach(() => {
  fetch.mockClear();
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
