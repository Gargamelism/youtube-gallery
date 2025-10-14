import { WatchStatus } from '@/types';
import { KeyboardShortcut } from './useKeyboardNavigation';

interface VideoPageShortcutsParams {
  updateFilter: (filter: string) => void;
  invalidateQueries: () => void;
  setShowShortcutsModal: (show: boolean) => void;
}

export function createVideoPageShortcuts(params: VideoPageShortcutsParams): KeyboardShortcut[] {
  const { updateFilter, invalidateQueries, setShowShortcutsModal } = params;

  return [
    {
      key: 'Home',
      action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      description: 'keyboardShortcuts.scrollToTop',
    },
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('.SearchInput__input');
        searchInput?.focus();
      },
      description: 'keyboardShortcuts.focusSearch',
    },
    {
      key: '1',
      action: () => updateFilter(WatchStatus.UNWATCHED),
      description: 'keyboardShortcuts.showUnwatched',
    },
    {
      key: '2',
      action: () => updateFilter(WatchStatus.WATCHED),
      description: 'keyboardShortcuts.showWatched',
    },
    {
      key: '3',
      action: () => updateFilter(WatchStatus.ALL),
      description: 'keyboardShortcuts.showAll',
    },
    {
      key: 'r',
      action: invalidateQueries,
      description: 'keyboardShortcuts.refreshVideos',
    },
    {
      key: '?',
      action: () => setShowShortcutsModal(true),
      description: 'keyboardShortcuts.showHelp',
    },
  ];
}
