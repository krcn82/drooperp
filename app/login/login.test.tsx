import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockInitiateEmailSignIn = jest.fn();
jest.mock('firebase', () => ({
  useAuth: () => ({}),
  useFirestore: () => ({}),
  initiateEmailSignIn: (...args) => mockInitiateEmailSignIn(...args),
}));

jest.mock('hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('LoginPage', () => {
  it('should clear the password field after a failed login attempt', async () => {
    // Arrange
    mockInitiateEmailSignIn.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />);

    const tenantIdInput = screen.getByLabelText('Tenant ID');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const signInButton = screen.getByRole('button', { name: 'Sign in' });

    // Act
    fireEvent.change(tenantIdInput, { target: { value: 'test-tenant' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    // Assert
    await waitFor(() => {
      expect(passwordInput).toHaveValue('');
    });
  });
});
