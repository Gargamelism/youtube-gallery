import { render, screen } from '@testing-library/react';
import {
  SkeletonGrid,
  SubscribedChannelCardSkeleton,
  AvailableChannelCardSkeleton,
} from '../ChannelCardSkeleton';

describe('SkeletonGrid', () => {
  it('renders the specified number of skeleton cards', () => {
    render(<SkeletonGrid count={3} cardSkeleton={<div data-testid="skeleton-card">Card</div>} />);

    const skeletonCards = screen.getAllByTestId('skeleton-card');
    expect(skeletonCards).toHaveLength(3);
  });

  it('renders each skeleton with proper accessibility attributes', () => {
    render(<SkeletonGrid count={2} cardSkeleton={<div>Card</div>} />);

    const statusElements = screen.getAllByRole('status');
    expect(statusElements).toHaveLength(2);

    statusElements.forEach(element => {
      expect(element).toHaveAttribute('aria-label', 'Loading channel');
    });
  });

  it('renders the provided card skeleton component', () => {
    render(<SkeletonGrid count={1} cardSkeleton={<SubscribedChannelCardSkeleton />} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles count of 0', () => {
    const { container } = render(<SkeletonGrid count={0} cardSkeleton={<div>Card</div>} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders large counts efficiently', () => {
    render(<SkeletonGrid count={21} cardSkeleton={<div data-testid="skeleton">Card</div>} />);

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons).toHaveLength(21);
  });
});

describe('SubscribedChannelCardSkeleton', () => {
  it('renders the skeleton structure', () => {
    const { container } = render(<SubscribedChannelCardSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('renders all skeleton elements matching SubscribedChannelCard layout', () => {
    const { container } = render(<SubscribedChannelCardSkeleton />);

    const skeletonElements = container.querySelectorAll('.bg-gray-200');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('has proper spacing and structure', () => {
    const { container } = render(<SubscribedChannelCardSkeleton />);

    expect(container.querySelector('.p-6')).toBeInTheDocument();
    expect(container.querySelector('.mb-4')).toBeInTheDocument();
  });
});

describe('AvailableChannelCardSkeleton', () => {
  it('renders the skeleton structure', () => {
    const { container } = render(<AvailableChannelCardSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('renders all skeleton elements matching AvailableChannelCard layout', () => {
    const { container } = render(<AvailableChannelCardSkeleton />);

    const skeletonElements = container.querySelectorAll('.bg-gray-200');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('includes description skeleton lines', () => {
    const { container } = render(<AvailableChannelCardSkeleton />);

    const descriptionElements = container.querySelectorAll('.h-4.bg-gray-200');
    expect(descriptionElements.length).toBeGreaterThan(2);
  });

  it('includes action button skeleton', () => {
    const { container } = render(<AvailableChannelCardSkeleton />);

    expect(container.querySelector('.h-9.w-24')).toBeInTheDocument();
  });
});
