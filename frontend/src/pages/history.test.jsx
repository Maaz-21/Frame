import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import History from './history';
import { AuthContext } from '../contexts/AuthContext';

const renderWithContext = (value) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <History />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('History page', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders meeting history entries', async () => {
    const getHistoryOfUser = jest.fn().mockResolvedValue([
      { meetingCode: 'alpha', date: new Date().toISOString() }
    ]);

    renderWithContext({
      getHistoryOfUser,
      getMeetingSummary: jest.fn(),
      regenerateMeetingSummary: jest.fn(),
      searchMeetingIntelligence: jest.fn()
    });

    expect(await screen.findByText('alpha')).toBeInTheDocument();
  });

  it('opens summary modal with data', async () => {
    const getHistoryOfUser = jest.fn().mockResolvedValue([
      { meetingCode: 'alpha', date: new Date().toISOString() }
    ]);

    const getMeetingSummary = jest.fn().mockResolvedValue({
      meetingCode: 'alpha',
      summaryStatus: 'ready',
      summaryPayload: {
        meetingTopic: 'Test Meeting',
        shortOverview: 'Summary text',
        mainDiscussionPoints: [],
        decisions: [],
        actionItems: [],
        blockersOrRisks: [],
        conclusions: []
      }
    });

    renderWithContext({
      getHistoryOfUser,
      getMeetingSummary,
      regenerateMeetingSummary: jest.fn(),
      searchMeetingIntelligence: jest.fn()
    });

    const buttons = await screen.findAllByTitle('View meeting summary');
    fireEvent.click(buttons[0]);

    expect(await screen.findByText('Test Meeting')).toBeInTheDocument();
  });
});
