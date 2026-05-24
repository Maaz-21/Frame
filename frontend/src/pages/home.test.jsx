import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Home from './home';
import { AuthContext } from '../contexts/AuthContext';

jest.mock('axios');

const renderWithContext = (value) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('Home page', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'token');
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders recent meetings when available', async () => {
    const getHistoryOfUser = jest.fn().mockResolvedValue([
      { meetingCode: 'alpha' },
      { meetingCode: 'beta' }
    ]);

    renderWithContext({ addToUserHistory: jest.fn(), getHistoryOfUser });

    expect(await screen.findByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('generates a meeting code on New Meeting', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.123456);

    renderWithContext({ addToUserHistory: jest.fn(), getHistoryOfUser: jest.fn().mockResolvedValue([]) });

    fireEvent.click(screen.getByText('New Meeting'));
    expect(screen.getByText(/Meeting code:/i)).toBeInTheDocument();

    Math.random.mockRestore();
  });

  it('shows a warning when meeting is inactive', async () => {
    axios.get.mockResolvedValue({ data: { active: false } });

    renderWithContext({ addToUserHistory: jest.fn(), getHistoryOfUser: jest.fn().mockResolvedValue([]) });

    fireEvent.change(screen.getByPlaceholderText('e.g. abc123'), { target: { value: 'alpha' } });
    fireEvent.click(screen.getByText('Join'));

    await waitFor(() => {
      expect(screen.getByText('No active meeting found with this code')).toBeInTheDocument();
    });
  });
});
