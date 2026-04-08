import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

describe('LoginPage', () => {
  it('renders and updates fields', () => {
    const setEmail = vi.fn();
    const setPassword = vi.fn();
    const setShowPassword = vi.fn();

    render(
      <LoginPage
        handleLogin={vi.fn()}
        email=""
        setEmail={setEmail}
        password=""
        setPassword={setPassword}
        showPassword={false}
        setShowPassword={setShowPassword}
        loginError=""
      />
    );

    fireEvent.change(screen.getByPlaceholderText('admin@realtorone.com'), {
      target: { value: 'admin@realtorone.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
      target: { value: 'secret' },
    });

    expect(setEmail).toHaveBeenCalled();
    expect(setPassword).toHaveBeenCalled();
    expect(screen.getByText('Infiltrate Control Plane')).toBeInTheDocument();
  });
});
