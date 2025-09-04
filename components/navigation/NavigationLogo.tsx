'use client';

import { useRouter } from 'next/navigation';

export default function NavigationLogo() {
  const router = useRouter();
  return (
    <div className="Navigation__logo flex-shrink-0">
      <button onClick={() => router.push('/')}>
        <h1 className="Navigation__title text-xl font-bold text-gray-900">YouTube Gallery</h1>
      </button>
    </div>
  );
}
