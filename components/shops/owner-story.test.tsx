import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OwnerStory } from './owner-story';

describe('OwnerStory', () => {
  const story = {
    id: 'c1',
    title: null,
    body: '我們從2019年在大稻埕開始這段旅程。',
    photo_url: null,
    is_published: true,
    updated_at: '2026-03-27T00:00:00Z',
  };

  it('renders story body when story is published', () => {
    render(<OwnerStory story={story} shopId="shop-1" isOwner={false} />);
    expect(
      screen.getByText('我們從2019年在大稻埕開始這段旅程。')
    ).toBeInTheDocument();
    expect(screen.getByText('From the Owner')).toBeInTheDocument();
  });

  it('renders nothing when story is null', () => {
    const { container } = render(
      <OwnerStory story={null} shopId="shop-1" isOwner={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows edit CTA for verified owner viewing their shop', () => {
    render(<OwnerStory story={story} shopId="shop-1" isOwner={true} />);
    expect(screen.getByText(/edit your story/i)).toBeInTheDocument();
  });

  it('hides story when is_published is false', () => {
    const draft = { ...story, is_published: false };
    const { container } = render(
      <OwnerStory story={draft} shopId="shop-1" isOwner={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
