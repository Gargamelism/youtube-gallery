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
    expect(badge.closest('.tag-badge')).toHaveStyle({
      backgroundColor: '#3B82F6',
    });
  });

  it('handles different sizes', () => {
    const { rerender } = render(<TagBadge tag={mockTag} size="sm" />);
    expect(screen.getByText('Tech').closest('.tag-badge')).toHaveClass('tag-badge-sm');

    rerender(<TagBadge tag={mockTag} size="lg" />);
    expect(screen.getByText('Tech').closest('.tag-badge')).toHaveClass('tag-badge-lg');
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
    
    fireEvent.click(screen.getByRole('button'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});