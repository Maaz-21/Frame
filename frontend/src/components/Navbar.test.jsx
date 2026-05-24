import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';
import { __mockedNavigate } from 'react-router-dom';

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
    __mockedNavigate.mockClear();
  });

  it('shows sign in when logged out', () => {
    render(<Navbar />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).toBeNull();
  });

  it('shows user info and sign out when logged in', () => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('username', 'tester');

    render(<Navbar />);

    expect(screen.getByText('tester')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('clears auth data on sign out', () => {
    localStorage.setItem('token', 'token');
    localStorage.setItem('username', 'tester');
    localStorage.setItem('name', 'Test');

    render(<Navbar />);

    fireEvent.click(screen.getByText('Sign Out'));

    expect(localStorage.getItem('token')).toBeNull();
    expect(__mockedNavigate).toHaveBeenCalledWith('/');
  });
});
