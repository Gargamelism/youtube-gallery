import '@testing-library/jest-dom';

global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));