"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Check, ChevronDown, ChevronUp, Calendar, Eye, MessageCircle, StickyNote } from "lucide-react";
import Image from "next/image";
import { Video } from "@/types";

interface VideoCardProps {
  video: Video;
  onWatch: () => void;
  onToggleWatched: (isWatched: boolean, notes?: string) => void;
}

export function VideoCard({ video, onWatch, onToggleWatched }: VideoCardProps) {
  const { t } = useTranslation('videos');
  const [showDescription, setShowDescription] = useState(false);
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [notes, setNotes] = useState(video.notes || '');
  
  const isHebrew = (text: string | null) => {
    if (!text) return false;
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  };

  const getTextDirection = (text: string | null) => {
    return isHebrew(text) ? "rtl" : "ltr";
  };

  const getTextAlign = (text: string | null) => {
    return isHebrew(text) ? "text-right" : "text-left";
  };

  const handleWatchedToggle = () => {
    if (video.is_watched && notes !== video.notes) {
      onToggleWatched(false, notes);
    } else if (!video.is_watched && showNotesForm) {
      onToggleWatched(true, notes);
      setShowNotesForm(false);
    } else {
      onToggleWatched(!video.is_watched, notes);
    }
  };

  const handleNotesSubmit = () => {
    onToggleWatched(true, notes);
    setShowNotesForm(false);
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return null;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const [, hours, minutes, seconds] = match;
    const parts = [];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds && !hours && !minutes) parts.push(`${seconds}s`);
    
    return parts.join(' ') || duration;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="VideoCard relative overflow-hidden rounded-lg border bg-white shadow hover:shadow-lg transition-shadow p-4">
      <div className="VideoCard__content flex flex-col gap-4">
        <div className="VideoCard__thumbnail w-full h-48 relative overflow-hidden rounded-md">
          <Image 
            src={video.thumbnail_url} 
            alt={video.title} 
            fill 
            className="VideoCard__image object-cover" 
          />
          <button
            onClick={onWatch}
            className="VideoCard__play-overlay absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
          >
            <Play className="VideoCard__play-icon w-12 h-12 text-white" />
          </button>
          
          {video.duration && (
            <div className="VideoCard__duration absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {formatDuration(video.duration)}
            </div>
          )}
          
          {video.is_watched && (
            <div className="VideoCard__watched-indicator absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
              <Check className="VideoCard__watched-icon w-4 h-4" />
            </div>
          )}
        </div>

        <div className="VideoCard__info flex-1 min-w-0">
          <h3
            className={`VideoCard__title text-lg font-semibold mb-2 line-clamp-2 ${getTextAlign(video.title)}`}
            style={{ direction: getTextDirection(video.title) }}
            title={video.title}
          >
            {video.title}
          </h3>

          <div className="VideoCard__channel text-sm text-blue-600 mb-2">
            {video.channel_title}
          </div>

          <div className="VideoCard__stats flex items-center gap-4 text-xs text-gray-500 mb-3">
            {video.published_at && (
              <div className="VideoCard__stat flex items-center gap-1">
                <Calendar className="VideoCard__stat-icon w-3 h-3" />
                {formatDate(video.published_at)}
              </div>
            )}
            
            {video.view_count && (
              <div className="VideoCard__stat flex items-center gap-1">
                <Eye className="VideoCard__stat-icon w-3 h-3" />
                {formatNumber(video.view_count)} {t('views')}
              </div>
            )}
            
            {video.comment_count && (
              <div className="VideoCard__stat flex items-center gap-1">
                <MessageCircle className="VideoCard__stat-icon w-3 h-3" />
                {formatNumber(video.comment_count)}
              </div>
            )}
          </div>

          {video.description && (
            <div className="VideoCard__description mb-3">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="VideoCard__description-toggle flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mb-2"
              >
                {showDescription ? (
                  <ChevronUp className="VideoCard__chevron w-4 h-4" />
                ) : (
                  <ChevronDown className="VideoCard__chevron w-4 h-4" />
                )}
                {showDescription ? t('hideDescription') : t('showDescription')}
              </button>
              
              {showDescription && (
                <div
                  className={`VideoCard__description-text text-sm text-gray-700 leading-relaxed cursor-pointer max-h-32 overflow-y-auto ${getTextAlign(video.description)}`}
                  style={{ direction: getTextDirection(video.description) }}
                  onClick={() => setShowDescription(false)}
                >
                  {video.description}
                </div>
              )}
            </div>
          )}

          {video.notes && !showNotesForm && (
            <div className="VideoCard__notes mb-3 p-3 bg-yellow-50 rounded-lg">
              <div className="VideoCard__notes-header flex items-center gap-2 mb-2">
                <StickyNote className="VideoCard__notes-icon w-4 h-4 text-yellow-600" />
                <span className="VideoCard__notes-label text-sm font-medium text-yellow-800">{t('yourNotes')}</span>
              </div>
              <p className="VideoCard__notes-text text-sm text-gray-700">{video.notes}</p>
            </div>
          )}

          {video.is_watched && video.watched_at && (
            <div className="VideoCard__watched-date text-xs text-gray-500 mb-3">
              {t('watchedOn')} {formatDate(video.watched_at)}
            </div>
          )}

          <div className="VideoCard__actions flex items-center gap-3">
            <button
              onClick={handleWatchedToggle}
              className={`VideoCard__watch-button flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                video.is_watched 
                  ? "bg-green-100 text-green-700 hover:bg-green-200" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Check className="VideoCard__check-icon w-4 h-4" />
              {video.is_watched ? t('watched') : t('markAsWatched')}
            </button>

            {!video.is_watched && (
              <button
                onClick={() => setShowNotesForm(!showNotesForm)}
                className="VideoCard__notes-button flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <StickyNote className="VideoCard__notes-button-icon w-4 h-4" />
                {t('addNotes')}
              </button>
            )}
          </div>

          {showNotesForm && (
            <div className="VideoCard__notes-form mt-3 p-3 bg-gray-50 rounded-lg">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="VideoCard__notes-textarea w-full p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="VideoCard__notes-actions flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowNotesForm(false)}
                  className="VideoCard__notes-cancel px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  {t('common:cancel')}
                </button>
                <button
                  onClick={handleNotesSubmit}
                  className="VideoCard__notes-save px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('saveMarkWatched')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}