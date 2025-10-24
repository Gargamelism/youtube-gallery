'use client';

import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { KeyboardShortcut } from './useKeyboardNavigation';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsModal({ isOpen, onClose, shortcuts }: KeyboardShortcutsModalProps) {
  const { t: tCommon } = useTranslation('common');
  const { t: tVideos } = useTranslation('videos');

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const labels: string[] = [];
    if (shortcut.ctrlKey) labels.push(tCommon('key.ctrl'));
    if (shortcut.shiftKey) labels.push(tCommon('key.shift'));
    if (shortcut.altKey) labels.push(tCommon('key.alt'));
    labels.push(shortcut.key);
    return labels.join(` ${tCommon('key.plus')} `);
  };

  return (
    <div
      className="KeyboardShortcutsModal__overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="KeyboardShortcutsModal__content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-modal-title"
      >
        <div className="KeyboardShortcutsModal__header flex items-center justify-between p-6 border-b">
          <h2 id="keyboard-shortcuts-modal-title" className="text-2xl font-bold">
            {tCommon('keyboardShortcuts')}
          </h2>
          <button
            onClick={onClose}
            className="KeyboardShortcutsModal__close-button p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={tCommon('close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="KeyboardShortcutsModal__body p-6">
          <div className="KeyboardShortcutsModal__shortcuts-list grid gap-4">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="KeyboardShortcutsModal__shortcut-item flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <span className="KeyboardShortcutsModal__description text-gray-700">
                  {tVideos(shortcut.description)}
                </span>
                <kbd className="KeyboardShortcutsModal__keys px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
