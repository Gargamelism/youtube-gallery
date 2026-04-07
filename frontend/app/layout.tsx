import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Sidebar from '@/components/sidebar/Sidebar';
import { YouTubeAuthBanner } from '@/components/auth';

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
          <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <YouTubeAuthBanner />
              <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
