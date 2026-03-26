import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CommunitySummary } from './community-summary';

describe('a user viewing the community summary section', () => {
  it('sees the "What visitors say" heading when summary exists', () => {
    render(
      <CommunitySummary summary="顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。" />
    );
    expect(screen.getByText(/What visitors say/i)).toBeInTheDocument();
  });

  it('sees the summary text wrapped in quotation marks', () => {
    render(
      <CommunitySummary summary="顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。" />
    );
    expect(
      screen.getByText(/顧客推薦拿鐵和巴斯克蛋糕/)
    ).toBeInTheDocument();
  });

  it('sees a sparkle icon with tooltip explaining AI generation', () => {
    render(
      <CommunitySummary summary="顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。" />
    );
    const sparkle = screen.getByTitle(/AI generated from visitor check-ins/i);
    expect(sparkle).toBeInTheDocument();
  });

  it('does not see the section when summary is null', () => {
    const { container } = render(<CommunitySummary summary={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not see the section when summary is undefined', () => {
    const { container } = render(<CommunitySummary summary={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
