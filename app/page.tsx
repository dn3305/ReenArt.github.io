import Image from "next/image";
import Link from "next/link";
import { paintings } from "./data/paintings";

export default function Home() {
  // Select 3 featured paintings
  const featuredPaintings = paintings.filter(p =>
    p.id === "echoes-of-closeness" ||
    p.id === "crimson-catharsis" ||
    p.id === "zen-flow"
  );

  // Dynamically extract all unique series names from paintings
  const uniqueSeriesNames = Array.from(new Set(paintings.map(p => p.series).filter(Boolean)));

  const seriesList = uniqueSeriesNames.map(seriesName => {
    // Find the first painting in this series to use its cover image
    const matchingPainting = paintings.find(p => p.series === seriesName);
    const coverImage = matchingPainting && matchingPainting.images && matchingPainting.images.length > 0
      ? matchingPainting.images[0]
      : "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80"; // fallback

    return {
      name: seriesName,
      tag: seriesName,
      image: coverImage
    };
  });

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80"
            alt="Hero abstract painting background"
            fill
            priority
            className="object-cover brightness-[0.95] dark:brightness-[0.4] transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-4xl text-center px-6 md:px-12 flex flex-col items-center gap-6 animate-fade-in">
          <span className="text-[10px] tracking-[0.4em] uppercase text-accent font-medium">Fine Art Portfolio</span>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-extralight tracking-tight leading-none text-foreground">
            Capturing the Ephemeral
          </h1>
          <p className="max-w-xl text-sm sm:text-base font-light tracking-wide text-muted leading-relaxed">
            Exploring human connection, visceral energy, and organic textures through oils, heavy acrylics, and digital dreamscapes.
          </p>
          <div className="mt-4 flex gap-4">
            <Link
              href="/gallery"
              className="flex h-12 items-center justify-center border border-foreground bg-foreground text-background text-xs uppercase tracking-widest px-8 hover:bg-transparent hover:text-foreground transition-all duration-300"
            >
              View Gallery
            </Link>
            <Link
              href="/about"
              className="flex h-12 items-center justify-center border border-border-subtle bg-transparent text-foreground text-xs uppercase tracking-widest px-8 hover:border-foreground transition-all duration-300"
            >
              Artist Statement
            </Link>
          </div>
        </div>
      </section>

      {/* Artist Statement Intro */}
      <section className="py-24 border-y border-border-subtle bg-background">
        <div className="mx-auto max-w-7xl px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-3xl md:text-4xl font-light tracking-wide italic text-accent">
              "My paintings are thresholds to unexpressed feelings—where tension dissolves into texture."
            </h2>
          </div>
          <div className="flex flex-col gap-6 text-sm font-light text-muted leading-relaxed tracking-wide">
            <p>
              Working out of her studio, Nazia works across mediums to bridge the gap between tangible and emotional landscapes. Her paintings use heavy textures, organic fibers, and contrasting hues to invoke visceral reactions.
            </p>
            <p>
              Each series represents a specific era of study: from the deep charcoal and crimson movements of <em>Rage</em>, to the delicate, single-breath strokes of <em>Ink on Paper</em>, and the modern, boundless concepts in <em>Digital Art</em>.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Artworks */}
      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-6 md:px-12 flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] tracking-[0.3em] uppercase text-accent font-medium">Selected Works</span>
              <h2 className="font-serif text-3xl md:text-4xl font-light tracking-wide text-foreground">Featured Paintings</h2>
            </div>
            <Link
              href="/gallery"
              className="text-xs uppercase tracking-widest text-accent hover:text-foreground transition-colors group flex items-center gap-2"
            >
              See all pieces <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </Link>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredPaintings.map((painting) => (
              <Link
                key={painting.id}
                href={`/gallery/${painting.id}`}
                className="group flex flex-col gap-4"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-border-subtle">
                  <Image
                    src={painting.images[0]}
                    alt={painting.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {painting.status === 'sold' && (
                    <span className="absolute top-4 right-4 bg-background/90 text-foreground text-[9px] uppercase tracking-widest px-3 py-1 font-light border border-border-subtle">
                      Sold
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 px-1">
                  <span className="text-[9px] tracking-widest uppercase text-muted">{painting.series}</span>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-serif text-lg font-light tracking-wide text-foreground group-hover:text-accent transition-colors">
                      {painting.title}
                    </h3>
                    <span className="text-xs font-light text-muted">{painting.formattedPrice}</span>
                  </div>
                  <span className="text-[10px] font-light text-muted italic">{painting.size} • {painting.medium}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Series Navigation Section */}
      <section className="py-24 border-t border-border-subtle bg-background">
        <div className="mx-auto max-w-7xl px-6 md:px-12 flex flex-col gap-12">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-accent font-medium">Explore Collections</span>
            <h2 className="font-serif text-3xl md:text-4xl font-light tracking-wide text-foreground">Explore by Series</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {seriesList.map((series) => (
              <Link
                key={series.name}
                href={`/gallery?series=${encodeURIComponent(series.tag)}`}
                className="relative aspect-square overflow-hidden group border border-border-subtle"
              >
                <Image
                  src={series.image}
                  alt={series.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 16vw"
                  className="object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <h3 className="font-serif text-sm sm:text-base text-white text-center font-light tracking-widest uppercase group-hover:scale-105 transition-transform">
                    {series.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

