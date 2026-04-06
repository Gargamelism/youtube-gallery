import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCard } from '../VideoCard';
import { NotInterestedFilter, Video } from '@/types';

const mockAddTag = jest.fn();
jest.mock('@/hooks/useVideoFilters', () => ({
  useVideoFilters: () => ({ addTag: mockAddTag }),
}));

jest.mock('@/utils/textHelpers', () => ({
  getTextDirection: () => 'ltr',
  getTextAlign: () => 'text-left',
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

jest.mock('../NotInterestedButton', () => ({
  NotInterestedButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="not-interested-btn" onClick={onClick}>
      Not Interested
    </button>
  ),
}));

const makeVideo = (overrides: Partial<Video> = {}): Video => ({
  uuid: 'test-uuid',
  video_id: 'vid123',
  channel_title: 'My Channel',
  title: 'Test Video Title',
  description: 'A description',
  published_at: '2025-01-15T00:00:00Z',
  duration: 'PT12M45S',
  view_count: 1234,
  like_count: 50,
  comment_count: 10,
  thumbnail_url: 'https://i.ytimg.com/vi/thumb/maxresdefault.jpg',
  video_url: 'https://youtube.com/watch?v=vid123',
  is_watched: false,
  watched_at: null,
  notes: null,
  is_not_interested: false,
  not_interested_at: null,
  channel_tags: [],
  watch_progress_seconds: 0,
  watch_percentage: 0,
  ...overrides,
});

const defaultProps = {
  video: makeVideo(),
  onWatch: jest.fn(),
  onToggleWatched: jest.fn(),
  onToggleNotInterested: jest.fn(),
  notInterestedFilter: NotInterestedFilter.EXCLUDE,
};

describe('VideoCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the video thumbnail', () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.getByAltText('Test Video Title')).toBeInTheDocument();
  });

  it('renders the video title', () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.getByText('Test Video Title')).toBeInTheDocument();
  });

  it('renders the channel name in purple', () => {
    render(<VideoCard {...defaultProps} />);
    const channel = screen.getByText('My Channel');
    expect(channel).toBeInTheDocument();
    expect(channel.className).toMatch(/text-purple-600/);
  });

  it('renders the published date', () => {
    render(<VideoCard {...defaultProps} />);
    expect(document.querySelector('.VideoCard__date')).toBeInTheDocument();
  });

  it('renders formatted duration on thumbnail', () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.getByText('12m 45s')).toBeInTheDocument();
  });

  it('does not render description section', () => {
    render(<VideoCard {...defaultProps} />);
    expect(document.querySelector('.VideoCard__description')).not.toBeInTheDocument();
    expect(screen.queryByText(/show description/i)).not.toBeInTheDocument();
  });

  it('does not render notes section', () => {
    const video = makeVideo({ notes: 'Some personal note' });
    render(<VideoCard {...defaultProps} video={video} />);
    expect(document.querySelector('.VideoCard__notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Some personal note')).not.toBeInTheDocument();
  });

  it('does not render Add notes button', () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.queryByText(/add notes/i)).not.toBeInTheDocument();
  });

  it('does not render view count', () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.queryByText(/views/i)).not.toBeInTheDocument();
    expect(screen.queryByText('1.2K')).not.toBeInTheDocument();
  });

  it('does not render comment count', () => {
    render(<VideoCard {...defaultProps} />);
    expect(document.querySelector('.VideoCard__stat')).not.toBeInTheDocument();
  });

  it('shows "Mark as watched" button when not watched', () => {
    render(<VideoCard {...defaultProps} />);
    expect(screen.getByText(/mark as watched/i)).toBeInTheDocument();
  });

  it('shows "Watched" state button when video is watched', () => {
    const video = makeVideo({ is_watched: true });
    render(<VideoCard {...defaultProps} video={video} />);
    expect(screen.getByText('watched')).toBeInTheDocument();
  });

  it('mark as watched button is full-width and dark purple when unwatched', () => {
    render(<VideoCard {...defaultProps} />);
    const btn = document.querySelector('.VideoCard__watch-button');
    expect(btn?.className).toMatch(/w-full/);
    expect(btn?.className).toMatch(/bg-purple-900/);
  });

  it('mark as watched button turns green when video is watched', () => {
    const video = makeVideo({ is_watched: true });
    render(<VideoCard {...defaultProps} video={video} />);
    const btn = document.querySelector('.VideoCard__watch-button');
    expect(btn?.className).toMatch(/bg-green-100/);
  });

  it('clicking thumbnail calls onWatch', () => {
    render(<VideoCard {...defaultProps} />);
    const thumbnail = document.querySelector('.VideoCard__thumbnail') as HTMLButtonElement;
    fireEvent.click(thumbnail);
    expect(defaultProps.onWatch).toHaveBeenCalledTimes(1);
  });

  it('clicking mark as watched calls onToggleWatched', () => {
    render(<VideoCard {...defaultProps} />);
    fireEvent.click(document.querySelector('.VideoCard__watch-button')!);
    expect(defaultProps.onToggleWatched).toHaveBeenCalledWith(true);
  });

  it('clicking mark as watched on watched video calls onToggleWatched with false', () => {
    const video = makeVideo({ is_watched: true });
    render(<VideoCard {...defaultProps} video={video} />);
    fireEvent.click(document.querySelector('.VideoCard__watch-button')!);
    expect(defaultProps.onToggleWatched).toHaveBeenCalledWith(false);
  });

  it('clicking a tag badge calls addTag', () => {
    const video = makeVideo({
      channel_tags: [{ id: 'tag1', name: 'yoga', color: '#ff6b6b' }],
    });
    render(<VideoCard {...defaultProps} video={video} />);
    fireEvent.click(screen.getByText('yoga'));
    expect(mockAddTag).toHaveBeenCalledWith('yoga');
  });

  it('shows up to 3 tags', () => {
    const video = makeVideo({
      channel_tags: [
        { id: '1', name: 'yoga', color: '#ff0000' },
        { id: '2', name: 'travel', color: '#00ff00' },
        { id: '3', name: 'music', color: '#0000ff' },
        { id: '4', name: 'food', color: '#ffff00' },
      ],
    });
    render(<VideoCard {...defaultProps} video={video} />);
    expect(screen.getByText('yoga')).toBeInTheDocument();
    expect(screen.getByText('travel')).toBeInTheDocument();
    expect(screen.getByText('music')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('food')).not.toBeInTheDocument();
  });

  it('shows watch progress bar when watch_percentage > 0', () => {
    const video = makeVideo({ watch_percentage: 45 });
    render(<VideoCard {...defaultProps} video={video} />);
    const progressBar = document.querySelector('.VideoCard__progress-bar') as HTMLElement;
    expect(progressBar).toBeInTheDocument();
    expect(progressBar.style.width).toBe('45%');
  });

  it('does not show progress bar when watch_percentage is 0', () => {
    render(<VideoCard {...defaultProps} />);
    expect(document.querySelector('.VideoCard__progress-bar')).not.toBeInTheDocument();
  });

  it('dims card when video is not interested and not showing not-interested filter', () => {
    const video = makeVideo({ is_not_interested: true });
    render(<VideoCard {...defaultProps} video={video} notInterestedFilter={NotInterestedFilter.EXCLUDE} />);
    expect(document.querySelector('.VideoCard__content')?.className).toMatch(/opacity-50/);
  });

  it('does not dim card when showing not-interested-only filter', () => {
    const video = makeVideo({ is_not_interested: true });
    render(<VideoCard {...defaultProps} video={video} notInterestedFilter={NotInterestedFilter.ONLY} />);
    expect(document.querySelector('.VideoCard__content')?.className).not.toMatch(/opacity-50/);
  });
});
