import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CountHeader } from './count-header';

describe('CountHeader', () => {
  it('renders count text with number of places', () => {
    render(<CountHeader count={12} view="map" onViewChange={() => {}} />);
    expect(screen.getByText('12 places nearby')).toBeInTheDocument();
  });

  it('renders view toggle', () => {
    render(<CountHeader count={12} view="map" onViewChange={() => {}} />);
    expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
  });

  it('renders sort button when onSort is provided', () => {
    render(
      <CountHeader count={12} view="map" onViewChange={() => {}} onSort={() => {}} />
    );
    expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
  });

  it('does not render sort button when onSort is not provided', () => {
    render(<CountHeader count={12} view="map" onViewChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /sort/i })).not.toBeInTheDocument();
  });

  it('passes view change through to ViewToggle', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<CountHeader count={5} view="map" onViewChange={onViewChange} />);
    await user.click(screen.getByRole('button', { name: /list/i }));
    expect(onViewChange).toHaveBeenCalledWith('list');
  });
});
