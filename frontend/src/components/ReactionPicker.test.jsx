import { render, screen, fireEvent } from '@testing-library/react';
import ReactionPicker from './ReactionPicker';

describe('ReactionPicker', () => {
  it('renders reactions when open and handles selection', () => {
    const onReact = jest.fn();
    const onClose = jest.fn();

    render(<ReactionPicker isOpen={true} onReact={onReact} onClose={onClose} />);

    const button = screen.getAllByRole('button')[0];
    fireEvent.click(button);

    expect(onReact).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when clicking outside', () => {
    const onReact = jest.fn();
    const onClose = jest.fn();

    render(<ReactionPicker isOpen={true} onReact={onReact} onClose={onClose} />);

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });
});
