import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CountHeader } from './count-header';

describe('a user interacting with the CountHeader', () => {
  it('a user browsing the map sees how many places are nearby', () => {
    render(<CountHeader count={12} view="map" onViewChange={() => {}} />);
    expect(screen.getByText('12 places nearby')).toBeInTheDocument();
  });

  it('a user sees map and list toggle buttons to switch views', () => {
    render(<CountHeader count={12} view="map" onViewChange={() => {}} />);
    expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
  });

  it('a user sees a sort button when sorting is available', () => {
    render(
      <CountHeader count={12} view="map" onViewChange={() => {}} onSort={() => {}} />
    );
    expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
  });

  it('a user does not see a sort button when sorting is unavailable', () => {
    render(<CountHeader count={12} view="map" onViewChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /sort/i })).not.toBeInTheDocument();
  });

  it('a user tapping the list toggle switches to list view', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<CountHeader count={5} view="map" onViewChange={onViewChange} />);
    await user.click(screen.getByRole('button', { name: /list/i }));
    expect(onViewChange).toHaveBeenCalledWith('list');
  });
});
