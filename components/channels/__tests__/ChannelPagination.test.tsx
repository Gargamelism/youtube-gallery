import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelPagination } from '../ChannelPagination';

describe('ChannelPagination', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination information correctly', () => {
    render(
      <ChannelPagination
        currentPage={1}
        totalPages={5}
        totalCount={100}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    expect(screen.getByText(/pagination\.showing/)).toBeInTheDocument();
    expect(screen.getByText(/pagination\.to/)).toBeInTheDocument();
    expect(screen.getByText(/pagination\.of/)).toBeInTheDocument();
    expect(screen.getByText(/pagination\.results/)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(
      <ChannelPagination
        currentPage={1}
        totalPages={5}
        totalCount={100}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    const previousButtons = screen.getAllByText('previous');
    previousButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('disables next button on last page', () => {
    render(
      <ChannelPagination
        currentPage={5}
        totalPages={5}
        totalCount={100}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    const nextButtons = screen.getAllByText('next');
    nextButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('calls onPageChange when clicking next button', () => {
    render(
      <ChannelPagination
        currentPage={2}
        totalPages={5}
        totalCount={100}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    const nextButtons = screen.getAllByText('next');
    const firstNextButton = nextButtons[0];
    if (firstNextButton) {
      fireEvent.click(firstNextButton);
    }

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange when clicking previous button', () => {
    render(
      <ChannelPagination
        currentPage={3}
        totalPages={5}
        totalCount={100}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    const previousButtons = screen.getAllByText('previous');
    const firstPreviousButton = previousButtons[0];
    if (firstPreviousButton) {
      fireEvent.click(firstPreviousButton);
    }

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when clicking specific page number', () => {
    render(
      <ChannelPagination
        currentPage={1}
        totalPages={5}
        totalCount={100}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    const pageButton = screen.getByRole('button', { name: '3' });
    fireEvent.click(pageButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('highlights current page button', () => {
    render(
      <ChannelPagination
        currentPage={3}
        totalPages={5}
        totalCount={100}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    const currentPageButton = screen.getByRole('button', { name: '3' });
    expect(currentPageButton).toHaveClass('bg-blue-600');
    expect(currentPageButton).toHaveClass('text-white');
  });

  it('calculates item range correctly for middle pages', () => {
    render(
      <ChannelPagination
        currentPage={3}
        totalPages={5}
        totalCount={100}
        pageSize={20}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    expect(screen.getByText('41')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('calculates item range correctly for last page with partial results', () => {
    render(
      <ChannelPagination
        currentPage={5}
        totalPages={5}
        totalCount={85}
        pageSize={20}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getAllByText('85')).toHaveLength(2);
  });

  it('does not render when totalPages is 1', () => {
    const { container } = render(
      <ChannelPagination
        currentPage={1}
        totalPages={1}
        totalCount={15}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not render when totalPages is 0', () => {
    const { container } = render(
      <ChannelPagination
        currentPage={1}
        totalPages={0}
        totalCount={0}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('applies custom pagination name to CSS classes', () => {
    const { container } = render(
      <ChannelPagination
        currentPage={1}
        totalPages={3}
        totalCount={50}
        onPageChange={mockOnPageChange}
        paginationName="available"
      />
    );

    expect(container.querySelector('.availablePagination')).toBeInTheDocument();
    expect(container.querySelector('.availablePagination__actions-wrapper')).toBeInTheDocument();
  });

  it('renders smart pagination with current page centered', () => {
    render(
      <ChannelPagination
        currentPage={5}
        totalPages={10}
        totalCount={200}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
  });

  it('renders first 5 pages when on page 1', () => {
    render(
      <ChannelPagination
        currentPage={1}
        totalPages={10}
        totalCount={200}
        onPageChange={mockOnPageChange}
        paginationName="subscribed"
      />
    );

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });
});
