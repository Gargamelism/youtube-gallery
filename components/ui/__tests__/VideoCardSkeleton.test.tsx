import { render } from '@testing-library/react';
import { VideoCardSkeleton } from '../VideoCardSkeleton';

describe('VideoCardSkeleton', () => {
  it('renders the skeleton structure with animate-pulse', () => {
    const { container } = render(<VideoCardSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(container.querySelector('.VideoCardSkeleton')).toBeInTheDocument();
  });

  it('includes thumbnail area with proper height', () => {
    const { container } = render(<VideoCardSkeleton />);

    const thumbnail = container.querySelector('.VideoCardSkeleton__thumbnail');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveClass('h-48');
  });

  it('includes duration badge placeholder', () => {
    const { container } = render(<VideoCardSkeleton />);

    const durationBadge = container.querySelector('.VideoCardSkeleton__duration');
    expect(durationBadge).toBeInTheDocument();
  });

  it('includes title skeleton with two lines', () => {
    const { container } = render(<VideoCardSkeleton />);

    const titleLine1 = container.querySelector('.VideoCardSkeleton__title-line1');
    const titleLine2 = container.querySelector('.VideoCardSkeleton__title-line2');

    expect(titleLine1).toBeInTheDocument();
    expect(titleLine2).toBeInTheDocument();
  });

  it('includes channel name placeholder', () => {
    const { container } = render(<VideoCardSkeleton />);

    const channelPlaceholder = container.querySelector('.VideoCardSkeleton__channel');
    expect(channelPlaceholder).toBeInTheDocument();
  });

  it('includes tag badge placeholders', () => {
    const { container } = render(<VideoCardSkeleton />);

    const tagContainer = container.querySelector('.VideoCardSkeleton__tags');
    expect(tagContainer).toBeInTheDocument();

    const tagPlaceholders = container.querySelectorAll('.VideoCardSkeleton__tag');
    expect(tagPlaceholders.length).toBe(3);
  });

  it('includes stats row placeholders', () => {
    const { container } = render(<VideoCardSkeleton />);

    const statsContainer = container.querySelector('.VideoCardSkeleton__stats');
    expect(statsContainer).toBeInTheDocument();

    const statPlaceholders = container.querySelectorAll('.VideoCardSkeleton__stat');
    expect(statPlaceholders.length).toBe(3);
  });

  it('includes action button placeholders', () => {
    const { container } = render(<VideoCardSkeleton />);

    const actionsContainer = container.querySelector('.VideoCardSkeleton__actions');
    expect(actionsContainer).toBeInTheDocument();

    const actionButtons = container.querySelectorAll('.VideoCardSkeleton__action-button');
    expect(actionButtons.length).toBe(2);
  });

  it('matches VideoCard layout structure', () => {
    const { container } = render(<VideoCardSkeleton />);

    const skeleton = container.querySelector('.VideoCardSkeleton');
    expect(skeleton).toHaveClass('relative', 'overflow-hidden', 'rounded-lg', 'border', 'bg-white', 'shadow', 'p-4');

    const content = container.querySelector('.VideoCardSkeleton__content');
    expect(content).toHaveClass('flex', 'flex-col', 'gap-4');

    const info = container.querySelector('.VideoCardSkeleton__info');
    expect(info).toHaveClass('flex-1', 'min-w-0');
  });

  it('uses consistent gray color scheme', () => {
    const { container } = render(<VideoCardSkeleton />);

    const grayElements = container.querySelectorAll('[class*="bg-gray"]');
    expect(grayElements.length).toBeGreaterThan(0);

    grayElements.forEach(element => {
      expect(element.className).toMatch(/bg-gray-[23]00/);
    });
  });

  it('has all semantic class names', () => {
    const { container } = render(<VideoCardSkeleton />);

    expect(container.querySelector('.VideoCardSkeleton__content')).toBeInTheDocument();
    expect(container.querySelector('.VideoCardSkeleton__thumbnail')).toBeInTheDocument();
    expect(container.querySelector('.VideoCardSkeleton__info')).toBeInTheDocument();
    expect(container.querySelector('.VideoCardSkeleton__tags')).toBeInTheDocument();
    expect(container.querySelector('.VideoCardSkeleton__stats')).toBeInTheDocument();
    expect(container.querySelector('.VideoCardSkeleton__actions')).toBeInTheDocument();
  });
});
