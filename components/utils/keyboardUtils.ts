import { KeyboardEvent } from 'react';

export const handleKeyboardActivation = (handler: (event: KeyboardEvent) => void) => {
  return (event: KeyboardEvent) => {
    console.log('Key pressed:', event.key);
    if (event.key === 'Enter') {
      handler(event);
    }

    if (event.key === ' ') {
      // Space: prevent default scroll behavior, activate on keyup
      event.preventDefault(); // Prevent scrolling
      if (event.type === 'keyup') {
        handler(event);
      }
    }
  };
};
