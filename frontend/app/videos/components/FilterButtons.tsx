'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { NotInterestedFilter, TagMode, TagModeType } from '@/types';
import { SortSelector } from './SortSelector';
import { TagBadge } from '@/components/tags/TagBadge';
import { useChannelTags } from '@/components/tags/mutations';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id: string;
}

function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps) {
  return (
    <div className="ToggleSwitch flex items-center gap-2 cursor-pointer select-none">
      <span className="text-sm text-gray-700" onClick={() => onChange(!checked)}>
        {label}
      </span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`ToggleSwitch__track relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
          checked ? 'bg-purple-700' : 'bg-gray-300'
        }`}
      >
        <span
          className={`ToggleSwitch__thumb inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface AddTagDropdownProps {
  availableTags: { id: string; name: string; color: string }[];
  onAdd: (tagName: string) => void;
  triggerLabel: string;
}

function AddTagDropdown({ availableTags, onAdd, triggerLabel }: AddTagDropdownProps) {
  const { t } = useTranslation('videos');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (availableTags.length === 0) return null;

  const filteredTags = availableTags.filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const menuId = 'add-tag-dropdown-menu';

  return (
    <div className="AddTagDropdown relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="AddTagDropdown__trigger flex items-center gap-1 px-3 py-1 text-sm text-gray-600 border border-dashed border-gray-300 rounded-full hover:border-gray-400 hover:text-gray-800 transition-colors"
      >
        <Plus className="h-3 w-3" />
        {triggerLabel}
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="AddTagDropdown__menu absolute top-full left-0 mt-1 z-30 bg-white rounded-lg shadow-lg border border-gray-200 min-w-40"
        >
          <div
            className="AddTagDropdown__search flex items-center border-b border-gray-200"
            onClick={event => event.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder={t('tagFilters.searchPlaceholder')}
              className="flex-1 px-3 py-1.5 text-sm focus:outline-none rounded-tl-lg"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-2 text-gray-400 hover:text-gray-600"
                aria-label={t('tagFilters.clearSearch')}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="AddTagDropdown__list py-1 max-h-52 overflow-y-auto">
            {filteredTags.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{t('tagFilters.noMatchingTags')}</p>
            ) : (
              filteredTags.map(tag => (
                <button
                  key={tag.id}
                  role="menuitem"
                  onClick={() => {
                    onAdd(tag.name);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="AddTagDropdown__item w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterButtons() {
  const { t } = useTranslation('videos');

  const TAG_MODE_OPTIONS: { value: TagModeType; label: string }[] = [
    { value: TagMode.ANY, label: t('tagFilters.anyOfThese') },
    { value: TagMode.ALL, label: t('tagFilters.allOfThese') },
    { value: TagMode.EXCEPT, label: t('tagFilters.noneOfThese') },
  ];
  const {
    selectedTags,
    tagMode,
    notInterestedFilter,
    sort,
    shorterThan,
    longerThan,
    isShort,
    updateTags,
    updateTagMode,
    updateNotInterestedFilter,
    updateSort,
    updateDurationBounds,
    updateIsShort,
    removeTag,
  } = useVideoFilters();

  const { data: tagsData } = useChannelTags();
  const allTags = tagsData?.results ?? [];
  const selectedTagObjects = allTags.filter(tag => selectedTags.includes(tag.name));
  const availableTags = allTags.filter(tag => !selectedTags.includes(tag.name));

  const isShortsHidden = isShort === false;
  const isNotInterestedHidden = notInterestedFilter === NotInterestedFilter.EXCLUDE;

  const handleShorterThanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    const newShorterThan = value > 0 ? value : undefined;
    const correctedLongerThan =
      newShorterThan !== undefined && longerThan !== undefined && longerThan >= newShorterThan
        ? newShorterThan - 1 > 0
          ? newShorterThan - 1
          : undefined
        : longerThan;
    updateDurationBounds(newShorterThan, correctedLongerThan);
  };

  const handleLongerThanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    const newLongerThan = value > 0 ? value : undefined;
    const correctedShorterThan =
      newLongerThan !== undefined && shorterThan !== undefined && shorterThan <= newLongerThan
        ? newLongerThan + 1
        : shorterThan;
    updateDurationBounds(correctedShorterThan, newLongerThan);
  };

  const handleHideShortsToggle = (checked: boolean) => {
    updateIsShort(checked ? false : undefined);
  };

  const handleHideNotInterestedToggle = (checked: boolean) => {
    updateNotInterestedFilter(checked ? NotInterestedFilter.EXCLUDE : NotInterestedFilter.INCLUDE);
  };

  return (
    <div className="FilterButtons__wrapper px-6 py-3 bg-white border-b border-gray-200 space-y-3">
      {/* Row 1: Duration + Toggles + Sort */}
      <div className="FilterButtons__controls flex flex-wrap items-center gap-6">
        <label className="FilterButtons__shorter-than flex items-center gap-2 text-sm text-gray-700">
          <span>{t('durationFilter.shorterThan')}</span>
          <input
            type="number"
            min={0}
            value={shorterThan ?? ''}
            onChange={handleShorterThanChange}
            placeholder="—"
            className="w-14 px-2 py-1 rounded border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-gray-500 uppercase text-xs">{t('durationFilter.minutesSuffix')}</span>
        </label>

        <label className="FilterButtons__longer-than flex items-center gap-2 text-sm text-gray-700">
          <span>{t('durationFilter.longerThan')}</span>
          <input
            type="number"
            min={0}
            value={longerThan ?? ''}
            onChange={handleLongerThanChange}
            placeholder="—"
            className="w-14 px-2 py-1 rounded border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-gray-500 uppercase text-xs">{t('durationFilter.minutesSuffix')}</span>
        </label>

        <ToggleSwitch
          id="hide-shorts-toggle"
          checked={isShortsHidden}
          onChange={handleHideShortsToggle}
          label={t('shortsFilter.hide')}
        />

        <ToggleSwitch
          id="hide-not-interested-toggle"
          checked={isNotInterestedHidden}
          onChange={handleHideNotInterestedToggle}
          label={t('hideNotInterested')}
        />

        <div className="ml-auto">
          <SortSelector sort={sort ?? 'in_progress_first'} onSortChange={updateSort} />
        </div>
      </div>

      {/* Row 2: Tag filters */}
      <div className="FilterButtons__tags flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
          {t('tagFilters.label')}
        </span>

        {selectedTagObjects.map(tag => (
          <TagBadge key={tag.id} tag={tag} size="sm" removable onRemove={() => removeTag(tag.name)} />
        ))}

        <AddTagDropdown
          availableTags={availableTags}
          onAdd={tagName => updateTags([...selectedTags, tagName])}
          triggerLabel={t('tagFilters.addTag')}
        />

        {selectedTags.length > 0 && (
          <button
            onClick={() => updateTags([])}
            className="FilterButtons__clear-all text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            {t('tagFilters.clearAll')}
          </button>
        )}

        {selectedTags.length > 0 && (
          <div className="FilterButtons__tag-mode flex items-center gap-1 ml-auto">
            {TAG_MODE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => updateTagMode(option.value)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  tagMode === option.value
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
