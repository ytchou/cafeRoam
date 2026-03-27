import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardEdit } from './dashboard-edit';

const story = {
  id: 'story-1',
  title: '我的咖啡館',
  body: '這裡是店家的故事內容。',
  photo_url: null,
  is_published: true,
};

describe('DashboardEdit', () => {
  const onSaveStory = vi.fn().mockResolvedValue(undefined);
  const onSaveTags = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => vi.clearAllMocks());

  it('renders story textarea and publish checkbox', () => {
    render(
      <DashboardEdit
        story={story}
        tags={['安靜', '插座']}
        onSaveStory={onSaveStory}
        onSaveTags={onSaveTags}
      />
    );
    expect(screen.getByLabelText('Story')).toBeTruthy();
    expect(
      (screen.getByLabelText('Story') as HTMLTextAreaElement).value
    ).toBe('這裡是店家的故事內容。');
    expect(
      (screen.getByLabelText('公開發布') as HTMLInputElement).checked
    ).toBe(true);
  });

  it('owner saves story and sees confirmation', async () => {
    render(
      <DashboardEdit
        story={story}
        tags={[]}
        onSaveStory={onSaveStory}
        onSaveTags={onSaveTags}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '發布' }));
    await waitFor(() => expect(onSaveStory).toHaveBeenCalledOnce());
    expect(onSaveStory).toHaveBeenCalledWith({
      body: story.body,
      is_published: true,
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '已儲存' })).toBeTruthy()
    );
  });

  it('save button is disabled while saving', async () => {
    let resolve: () => void;
    onSaveStory.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolve = r;
      })
    );
    render(
      <DashboardEdit
        story={story}
        tags={[]}
        onSaveStory={onSaveStory}
        onSaveTags={onSaveTags}
      />
    );
    const button = screen.getByRole('button', { name: '發布' });
    await userEvent.click(button);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '儲存中...' })).toBeTruthy()
    );
    expect(screen.getByRole('button', { name: '儲存中...' })).toBeDisabled();
    resolve!();
  });

  it('renders with null story without crashing', () => {
    render(
      <DashboardEdit
        story={null}
        tags={[]}
        onSaveStory={onSaveStory}
        onSaveTags={onSaveTags}
      />
    );
    expect(
      (screen.getByLabelText('Story') as HTMLTextAreaElement).value
    ).toBe('');
  });

  it('owner can uncheck publish toggle', async () => {
    render(
      <DashboardEdit
        story={story}
        tags={[]}
        onSaveStory={onSaveStory}
        onSaveTags={onSaveTags}
      />
    );
    const checkbox = screen.getByLabelText('公開發布') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole('button', { name: '發布' }));
    await waitFor(() =>
      expect(onSaveStory).toHaveBeenCalledWith({
        body: story.body,
        is_published: false,
      })
    );
  });
});
