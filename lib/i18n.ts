import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enNavigation from '@/locales/en/navigation.json';
import enVideos from '@/locales/en/videos.json';
import enChannels from '@/locales/en/channels.json';
import enTags from '@/locales/en/tags.json';
import enQuota from '@/locales/en/quota.json';
import enSettings from '@/locales/en/settings.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    videos: enVideos,
    channels: enChannels,
    tags: enTags,
    quota: enQuota,
    settings: enSettings,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  debug: process.env.NODE_ENV === 'development',

  ns: ['common', 'auth', 'navigation', 'videos', 'channels', 'tags', 'quota', 'settings'],
  defaultNS: 'common',

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
