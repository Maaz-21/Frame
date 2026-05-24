import { render, screen } from '@testing-library/react';
import axios from 'axios';
import VideoMeet from './VideoMeet';

jest.mock('axios');

const renderMeeting = () => render(<VideoMeet />);

describe('VideoMeet page', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: [] });
    localStorage.clear();
    window.history.pushState({}, '', '/g-test123');
  });

  it('renders the lobby with meeting code', async () => {
    renderMeeting();

    expect(await screen.findByText('Join Meeting')).toBeInTheDocument();
    expect(screen.getByText('g-test123')).toBeInTheDocument();
  });
});
