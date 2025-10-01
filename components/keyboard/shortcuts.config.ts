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
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
        searchInput?.focus();
      },
      description: 'keyboardShortcuts.focusSearch',
    },
    {
      key: '1',
      action: () => updateFilter('unwatched'),
      description: 'keyboardShortcuts.showUnwatched',
    },
    {
      key: '2',
      action: () => updateFilter('watched'),
      description: 'keyboardShortcuts.showWatched',
    },
    {
      key: '3',
      action: () => updateFilter('all'),
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