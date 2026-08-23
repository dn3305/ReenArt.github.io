'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { paintings } from '../data/paintings';

// Helper to get unique filters dynamically based on current catalog
function getFilters(paintingsList: typeof paintings) {
  const uniqueSeries = Array.from(new Set(paintingsList.map(p => p.series).filter(Boolean)));
  return ['All', ...uniqueSeries];
}

function GalleryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtersList = getFilters(paintings);

  // Sync state with query parameters
  useEffect(() => {
    const seriesParam = searchParams.get('series');
    if (seriesParam && filtersList.some(f => f.toLowerCase() === seriesParam.toLowerCase())) {
      // Find the exact casing
      const matchedFilter = filtersList.find(f => f.toLowerCase() === seriesParam.toLowerCase());
      if (matchedFilter) setActiveFilter(matchedFilter);
    } else {
      setActiveFilter('All');
    }
  }, [searchParams, filtersList]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    // Update URL query parameters
    if (filter === 'All') {
      router.push('/gallery', { scroll: false });
    } else {
      router.push(`/gallery?series=${encodeURIComponent(filter)}`, { scroll: false });
    }
  };

  const filteredPaintings = activeFilter === 'All'
    ? paintings
    : paintings.filter(p => p.series.toLowerCase() === activeFilter.toLowerCase());

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 animate-fade-in">
      {/* Intro Header */}
      <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto mb-16">
        <span className="text-[10px] tracking-[0.4em] uppercase text-accent font-medium">The Collections</span>
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-wide text-foreground">
          Art Gallery
        </h1>
        <p className="text-xs md:text-sm font-light text-muted tracking-wide leading-relaxed">
          Explore Nazia's visual art series. Each painting is an original piece, textured, signed, and ready to become a focal point in your collection.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mb-16 border-b border-border-subtle pb-6 overflow-x-auto scrollbar-none">
        {filtersList.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`text-xs uppercase tracking-widest px-4 py-2 border transition-all duration-300 ${
                isActive
                  ? 'bg-foreground text-background border-foreground font-medium'
                  : 'bg-transparent text-muted border-transparent hover:text-foreground hover:border-border-subtle'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Paintings Grid */}
      {filteredPaintings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm font-light text-muted tracking-widest uppercase">
            No paintings found in this collection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {filteredPaintings.map((painting) => (
            <Link
              key={painting.id}
              href={`/gallery/${painting.id}`}
              className="group flex flex-col gap-4"
            >
              {/* Image Box */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-border-subtle">
                <Image
                  src={painting.images[0]}
                  alt={painting.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-background/90 text-foreground text-[8px] uppercase tracking-widest px-2.5 py-1 font-light border border-border-subtle">
                    {painting.series}
                  </span>
                </div>
                
                {painting.status === 'sold' && (
                  <span className="absolute top-4 right-4 bg-background/95 text-foreground text-[8px] uppercase tracking-widest px-3 py-1 font-light border border-border-subtle">
                    Sold
                  </span>
                )}
              </div>

              {/* Painting Metadata */}
              <div className="flex flex-col gap-1 px-1">
                <div className="flex justify-between items-baseline gap-2">
                  <h3 className="font-serif text-lg font-light tracking-wide text-foreground group-hover:text-accent transition-colors">
                    {painting.title}
                  </h3>
                  <span className="text-xs font-light text-muted shrink-0">
                    {painting.formattedPrice}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-light text-muted tracking-wide mt-1">
                  <span>{painting.medium}</span>
                  <span className="italic shrink-0">{painting.size}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 animate-pulse">
      <div className="h-8 w-48 bg-border-subtle mx-auto mb-4" />
      <div className="h-4 w-96 bg-border-subtle mx-auto mb-16" />
      <div className="h-10 w-full max-w-2xl bg-border-subtle mx-auto mb-16" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col gap-4">
            <div className="aspect-[4/5] bg-border-subtle" />
            <div className="h-4 bg-border-subtle w-3/4" />
            <div className="h-3 bg-border-subtle w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <GalleryContent />
    </Suspense>
  );
}
