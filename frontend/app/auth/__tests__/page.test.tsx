import React from 'react';
import { render, screen } from '@testing-library/react';
import AuthPage from '../page';

const mockLogout = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

let mockIsAuthenticated = false;
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: mockIsAuthenticated,
    logout: mockLogout,
  }),
}));

jest.mock('../components/LoginForm', () => ({
  __esModule: true,
  default: ({ onSwitchToRegister }: { onSwitchToRegister: () => void }) => (
    <div data-testid="login-form">
      <button onClick={onSwitchToRegister}>switch-to-register</button>
    </div>
  ),
}));

jest.mock('../components/RegisterForm', () => ({
  __esModule: true,
  default: () => <div data-testid="register-form" />,
}));

function setSearchParams(query: string) {
  mockSearchParams = new URLSearchParams(query);
}

describe('AuthPage — stale-token reconciliation', () => {
  beforeEach(() => {
    mockIsAuthenticated = false;
    setSearchParams('');
    jest.clearAllMocks();
  });

  it('renders login form when unauthenticated and no returnUrl', () => {
    render(<AuthPage />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders login form when unauthenticated even if returnUrl is present', () => {
    setSearchParams('returnUrl=/videos');
    render(<AuthPage />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('calls logout and renders login form when stale auth + returnUrl present', () => {
    mockIsAuthenticated = true;
    setSearchParams('returnUrl=/videos');
    render(<AuthPage />);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to / and shows Loading placeholder when authenticated and no returnUrl', () => {
    mockIsAuthenticated = true;
    render(<AuthPage />);
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
