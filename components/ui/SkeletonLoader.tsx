const SkeletonLoader: React.FC = () => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md">
      <div className="relative">
        <div className="skeleton h-44 w-full"></div>
        <div className="skeleton absolute bottom-2 right-2 w-12 h-5 rounded"></div>
      </div>
      <div className="p-3 flex gap-3">
        <div className="skeleton w-9 h-9 rounded-full flex-shrink-0"></div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="skeleton h-4 w-full rounded"></div>
          <div className="skeleton h-4 w-5/6 rounded"></div>
          <div className="skeleton h-3 w-2/3 rounded"></div>
        </div>
        <div className="skeleton w-6 h-6 rounded-full"></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
