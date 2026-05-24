import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import Snackbar from './Snackbar';
describe('Snackbar', () => {
  it('renders message and closes on timeout', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    render(
      <Snackbar
        message="Saved"
        variant="success"
        isOpen={true}
        onClose={onClose}
        duration={500}
      />
    );

    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
        jest.advanceTimersByTime(800);
    });
    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('closes when close button is clicked', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    render(
      <Snackbar
        message="Hello"
        variant="info"
        isOpen={true}
        onClose={onClose}
        duration={5000}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
