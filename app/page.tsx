"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVideos } from "@/services/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function Home() {
  const router = useRouter();

  const { data: videosResponse, isLoading } = useQuery({
    queryKey: ["videos", ""],
    queryFn: () => fetchVideos(""),
  });

  useEffect(() => {
    if (!isLoading) {
      const totalVideos = videosResponse?.data?.count ?? 0;

      if (totalVideos > 0) {
        router.push("/videos");
      } else {
        router.push("/channels");
      }
    }
  }, [isLoading, videosResponse, router]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonLoader key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
