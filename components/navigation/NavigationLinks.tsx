"use client";

import { useRouter, usePathname } from "next/navigation";
import { type LucideIcon, Video, TvMinimalPlay } from "lucide-react";

interface NavigationLinksProps {
  isAuthenticated: boolean;
}

interface Link {
  name: string;
  path: string;
  icon: LucideIcon;
}

export default function NavigationLinks({ isAuthenticated }: NavigationLinksProps) {
  if (!isAuthenticated) return null;

  const router = useRouter();
  const pathname = usePathname();

  const links: Link[] = [
    { name: "Videos", path: "/videos", icon: Video },
    { name: "Channels", path: "/channels", icon: TvMinimalPlay },
  ];

  return (
    <>
      <div className="Navigation__links-nav flex flex-col lg:flex-row lg:ml-6 lg:space-x-8">
        {links.map((link) => {
          const isActive = pathname === link.path;
          const Icon = link.icon;
          return (
            <button
              onClick={() => router.push(link.path)}
              className="Navigation__link inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 aria-selected:text-gray-900 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300"
              aria-selected={isActive}
              key={link.name}
            >
              <Icon className="Navigation__nav-icon h-4 w-4 mr-2" />
              {link.name}
            </button>
          );
        })}
      </div>
    </>
  );
}
