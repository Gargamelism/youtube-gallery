"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface FilterButtonsProps {
  totalCount: number;
  watchedCount: number;
  unwatchedCount: number;
}

export function FilterButtons({ totalCount, watchedCount, unwatchedCount }: FilterButtonsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  };

  const handleFilterChange = (newFilter: string) => {
    router.push(pathname + "?" + createQueryString("filter", newFilter));
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <button
        onClick={() => handleFilterChange("all")}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"
        }`}
      >
        <span>All Videos</span>
        <span className="bg-opacity-20 bg-black px-2 rounded-full text-sm">{totalCount}</span>
      </button>
      <button
        onClick={() => handleFilterChange("unwatched")}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          filter === "unwatched" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"
        }`}
      >
        <span>Unwatched</span>
        <span className="bg-opacity-20 bg-black px-2 rounded-full text-sm">{unwatchedCount}</span>
      </button>
      <button
        onClick={() => handleFilterChange("watched")}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          filter === "watched" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"
        }`}
      >
        <span>Watched</span>
        <span className="bg-opacity-20 bg-black px-2 rounded-full text-sm">{watchedCount}</span>
      </button>
    </div>
  );
}