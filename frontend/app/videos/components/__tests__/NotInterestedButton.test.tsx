import { render, screen, fireEvent } from '@testing-library/react';
import { NotInterestedButton } from '../NotInterestedButton';
import { NotInterestedFilter } from '@/types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        markNotInterested: 'Not interested in this video',
        markInterested: 'Mark as interested again',
      };
      return translations[key] || key;
    },
  }),
}));

describe('NotInterestedButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe('Default state (not marked as not interested)', () => {
    it('renders X icon when not marked as not interested', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: /not interested in this video/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Not interested in this video');
    });

    it('is hidden by default with opacity-0', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-0');
      expect(button).toHaveClass('group-hover:opacity-100');
    });

    it('shows red theme for dismiss action', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-red-100');
      expect(button).toHaveClass('hover:text-red-700');
    });
  });

  describe('Marked as not interested state', () => {
    it('is always visible when marked as not interested', () => {
      render(
        <NotInterestedButton
          isNotInterested={true}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-100');
      expect(button).not.toHaveClass('opacity-0');
    });

    it('shows red background when marked not interested (exclude mode)', () => {
      render(
        <NotInterestedButton
          isNotInterested={true}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-100');
      expect(button).toHaveClass('text-red-700');
    });

    it('shows Plus icon when viewing not interested videos', () => {
      render(
        <NotInterestedButton
          isNotInterested={true}
          notInterestedFilter={NotInterestedFilter.ONLY}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: /mark as interested again/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Mark as interested again');
    });

    it('shows green theme when viewing not interested videos', () => {
      render(
        <NotInterestedButton
          isNotInterested={true}
          notInterestedFilter={NotInterestedFilter.ONLY}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-100');
      expect(button).toHaveClass('text-green-700');
    });
  });

  describe('Filter mode variations', () => {
    it('shows X icon in EXCLUDE mode', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: /not interested/i });
      expect(button).toBeInTheDocument();
    });

    it('shows Plus icon in ONLY mode', () => {
      render(
        <NotInterestedButton
          isNotInterested={true}
          notInterestedFilter={NotInterestedFilter.ONLY}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: /mark as interested again/i });
      expect(button).toBeInTheDocument();
    });

    it('shows Plus icon in INCLUDE mode when marked not interested', () => {
      render(
        <NotInterestedButton
          isNotInterested={true}
          notInterestedFilter={NotInterestedFilter.INCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: /mark as interested again/i });
      expect(button).toBeInTheDocument();
    });

    it('shows X icon in INCLUDE mode when not marked', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.INCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button', { name: /not interested/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label for screen readers', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Not interested in this video');
    });

    it('has visible focus ring', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-red-500');
    });

    it('shows focus ring on focus', () => {
      render(
        <NotInterestedButton
          isNotInterested={false}
          notInterestedFilter={NotInterestedFilter.EXCLUDE}
          onClick={mockOnClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:opacity-100');
    });
  });
});
