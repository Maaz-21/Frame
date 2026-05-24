import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Authentication from './authentication';
import { AuthContext } from '../contexts/AuthContext';

const renderWithContext = (value) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <Authentication />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('Authentication page', () => {
  it('shows validation error for empty login', async () => {
    const handleLogin = jest.fn();

    renderWithContext({ handleLogin, handleRegister: jest.fn() });

    fireEvent.submit(document.querySelector('form'));
    expect(await screen.findByText('Please fill in all fields')).toBeInTheDocument();
    expect(handleLogin).not.toHaveBeenCalled();
  });

  it('calls handleLogin with credentials', async () => {
    const handleLogin = jest.fn().mockResolvedValue(undefined);

    renderWithContext({ handleLogin, handleRegister: jest.fn() });

    fireEvent.change(screen.getByPlaceholderText('your_username'), { target: { value: 'tester' } });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'password123' } });

    fireEvent.submit(document.querySelector('form'));

    expect(handleLogin).toHaveBeenCalledWith('tester', 'password123');
  });

  it('validates password length on register', async () => {
    const handleRegister = jest.fn();

    renderWithContext({ handleLogin: jest.fn(), handleRegister });

    fireEvent.click(screen.getByText('Sign Up'));
    fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('your_username'), { target: { value: 'tester' } });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: '123' } });

    fireEvent.click(screen.getByText('Create Account'));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(handleRegister).not.toHaveBeenCalled();
  });
});
