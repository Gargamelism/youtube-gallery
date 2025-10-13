'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from 'use-debounce';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  namespace: string;
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 600;

export function SearchInput({ value, onChange, namespace, debounceMs = DEFAULT_DEBOUNCE_MS }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const { t } = useTranslation(namespace);

  const debouncedOnChange = useDebouncedCallback((newValue: string) => {
    onChange(newValue);
  }, debounceMs);

  useEffect(() => {
    if (value === '' && localValue !== '') {
      setLocalValue('');
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="SearchInput relative w-full max-w-md">
      <div className="SearchInput__icon absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={localValue}
        onChange={e => handleChange(e.target.value)}
        placeholder={t('search.placeholder')}
        className="SearchInput__input block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="SearchInput__clear-search absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700"
          aria-label={t('search.clear')}
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      )}
    </div>
  );
}
