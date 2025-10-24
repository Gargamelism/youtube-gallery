import { render, screen, fireEvent } from '@testing-library/react';
import { TagBadge } from '../TagBadge';
import { ChannelTag } from '@/types';

const mockTag: ChannelTag = {
  id: '1',
  name: 'Tech',
  color: '#3B82F6',
  description: 'Technology videos',
  channel_count: 5,
  created_at: '2023-01-01T00:00:00Z',
};

describe('TagBadge', () => {
  it('renders tag name and color', () => {
    render(<TagBadge tag={mockTag} />);

    const badge = screen.getByText('Tech');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.TagBadge')).toHaveStyle({
      backgroundColor: '#3b82f633',
      color: 'rgb(59, 130, 246)',
      border: '1px solid #3b82f666',
    });
  });

  const sizeTestCases = [
    { size: 'sm' as const, expectedClass: 'text-xs px-2 py-1' },
    { size: 'lg' as const, expectedClass: 'text-base px-4 py-2' },
  ];

  test.each(sizeTestCases)('handles $size size correctly', ({ size, expectedClass }) => {
    render(<TagBadge tag={mockTag} size={size} />);
    const badge = screen.getByText('Tech').closest('.TagBadge');
    expect(badge).toHaveClass(expectedClass);
  });

  it('shows remove button when removable', () => {
    const onRemove = jest.fn();
    render(<TagBadge tag={mockTag} removable onRemove={onRemove} />);

    const removeButton = screen.getByRole('button');
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('handles click events', () => {
    const onClick = jest.fn();
    render(<TagBadge tag={mockTag} onClick={onClick} />);

    fireEvent.click(screen.getByText('Tech'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('prevents event bubbling on remove', () => {
    const onClick = jest.fn();
    const onRemove = jest.fn();

    render(<TagBadge tag={mockTag} removable onRemove={onRemove} onClick={onClick} />);

    const removeButton = screen.getByRole('button', { name: /remove tech tag/i });
    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
