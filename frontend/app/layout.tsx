import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Navigation from '@/components/navigation/Navigation';
import { YouTubeAuthBanner } from '@/components/auth/YouTubeAuthBanner';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Video Gallery',
  description: 'A YouTube video gallery application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <Providers>
          <YouTubeAuthBanner />
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
