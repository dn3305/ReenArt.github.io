'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Painting } from '../../data/paintings';

interface Props {
  painting: Painting;
}

export default function PaintingDetailClient({ painting }: Props) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: `Hello Nazia,\n\nI am interested in acquiring your painting "${painting.title}" from the ${painting.series} series. Please let me know its availability, delivery options, and additional details.\n\nThank you.`
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API request to backend/email system
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
    }, 1500);
  };

  const closeInquiry = () => {
    setIsInquiryOpen(false);
    setFormSubmitted(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      message: `Hello Nazia,\n\nI am interested in acquiring your painting "${painting.title}" from the ${painting.series} series. Please let me know its availability, delivery options, and additional details.\n\nThank you.`
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-12 animate-fade-in flex-1 flex flex-col justify-start">
      {/* Breadcrumb Navigation */}
      <nav className="mb-10 text-[10px] uppercase tracking-widest text-muted flex items-center gap-2">
        <Link href="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
        <span>/</span>
        <Link href={`/gallery?series=${encodeURIComponent(painting.series)}`} className="hover:text-foreground transition-colors">{painting.series}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{painting.title}</span>
      </nav>

      {/* Main Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Side: Images View */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-border-subtle">
            <Image
              src={painting.images[activeImageIndex]}
              alt={`${painting.title} - View ${activeImageIndex + 1}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-all duration-500"
            />
            {painting.status === 'sold' && (
              <span className="absolute top-6 right-6 bg-background/95 text-foreground text-xs uppercase tracking-widest px-4 py-2 font-light border border-border-subtle">
                Sold
              </span>
            )}
          </div>

          {/* Thumbnails Row */}
          {painting.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {painting.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 overflow-hidden bg-neutral-100 border transition-all shrink-0 ${
                    activeImageIndex === idx ? 'border-accent ring-1 ring-accent/30' : 'border-border-subtle hover:border-accent/50'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail view ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Metadata and Info */}
        <div className="lg:col-span-5 flex flex-col gap-8 lg:sticky lg:top-28">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] tracking-[0.3em] uppercase text-accent font-medium">{painting.series} Series • {painting.year}</span>
            <h1 className="font-serif text-3xl md:text-5xl font-light tracking-wide text-foreground">
              {painting.title}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xl font-light text-accent tracking-wide">{painting.formattedPrice}</span>
              <span className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 border font-light ${
                painting.status === 'available'
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                  : 'border-neutral-500/20 bg-neutral-500/5 text-neutral-500'
              }`}>
                {painting.status}
              </span>
            </div>
          </div>

          {/* Specifications Card */}
          <div className="border-t border-b border-border-subtle py-6">
            <h3 className="text-xs uppercase tracking-widest text-foreground font-medium mb-4">Artwork Details</h3>
            <dl className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-light text-muted tracking-wide">
              <div>
                <dt className="uppercase text-[9px] text-muted tracking-widest font-normal mb-1">Medium</dt>
                <dd className="text-foreground">{painting.medium}</dd>
              </div>
              <div>
                <dt className="uppercase text-[9px] text-muted tracking-widest font-normal mb-1">Dimensions</dt>
                <dd className="text-foreground">{painting.size}</dd>
              </div>
              <div>
                <dt className="uppercase text-[9px] text-muted tracking-widest font-normal mb-1">Authenticity</dt>
                <dd className="text-foreground">Signed & Certified</dd>
              </div>
              <div>
                <dt className="uppercase text-[9px] text-muted tracking-widest font-normal mb-1">Origin</dt>
                <dd className="text-foreground">Artist's Studio</dd>
              </div>
            </dl>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-widest text-foreground font-medium">Concept & Inspiration</h3>
            <p className="text-sm font-light text-muted tracking-wide leading-relaxed">
              {painting.description}
            </p>
          </div>

          {/* Shipping Info */}
          <div className="flex flex-col gap-2 bg-neutral-50 dark:bg-neutral-900/50 border border-border-subtle p-5">
            <h4 className="text-[10px] uppercase tracking-widest text-accent font-medium">Acquiring this Artwork</h4>
            <p className="text-[11px] font-light text-muted leading-relaxed tracking-wide">
              {painting.details} Free worldwide shipping in custom wood crates or reinforced archival packaging. Ships within 5-7 business days with active tracking and insurance cover.
            </p>
          </div>

          {/* Inquiry CTA Button */}
          {painting.status === 'available' ? (
            <button
              onClick={() => setIsInquiryOpen(true)}
              className="w-full h-12 border border-foreground bg-foreground text-background text-xs uppercase tracking-widest hover:bg-transparent hover:text-foreground transition-all duration-300 font-medium"
            >
              Inquire to Acquire
            </button>
          ) : (
            <button
              onClick={() => setIsInquiryOpen(true)}
              className="w-full h-12 border border-border-subtle bg-transparent text-muted text-xs uppercase tracking-widest hover:border-foreground hover:text-foreground transition-all duration-300"
            >
              Request Custom Commission
            </button>
          )}
        </div>
      </div>

      {/* Inquiry Modal */}
      {isInquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeInquiry}
          />
          
          {/* Modal content */}
          <div className="relative w-full max-w-lg bg-background border border-border-subtle p-8 md:p-10 shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={closeInquiry}
              className="absolute top-6 right-6 text-muted hover:text-foreground hover:scale-115 transition-all text-sm uppercase tracking-widest"
              aria-label="Close modal"
            >
              ✕
            </button>

            {!formSubmitted ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1 pr-6">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-accent font-medium">Acquisition Request</span>
                  <h2 className="font-serif text-2xl font-light tracking-wide text-foreground">
                    Inquire: {painting.title}
                  </h2>
                  <p className="text-[10px] text-muted tracking-wide mt-1">
                    Complete the form below. Nazia will follow up directly regarding shipping estimates and checkout.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full h-10 border border-border-subtle bg-transparent px-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Your Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. john@example.com"
                        className="w-full h-10 border border-border-subtle bg-transparent px-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Your Phone (Optional)</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +1 555-0199"
                        className="w-full h-10 border border-border-subtle bg-transparent px-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full border border-border-subtle bg-transparent p-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 mt-2 bg-foreground text-background border border-foreground text-xs uppercase tracking-widest font-medium hover:bg-transparent hover:text-foreground disabled:opacity-50 transition-all duration-300"
                  >
                    {isSubmitting ? 'Sending Request...' : 'Send Inquiry'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-6">
                {/* Success Icon */}
                <div className="w-16 h-16 rounded-full border border-accent/30 bg-accent/5 flex items-center justify-center text-accent text-2xl font-light">
                  ✓
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-serif text-2xl font-light tracking-wide text-foreground">Inquiry Received</h3>
                  <p className="text-xs font-light text-muted leading-relaxed max-w-sm tracking-wide">
                    Thank you for your interest in Nazia's work. A personal response and invoice outline will be sent to <strong>{formData.email}</strong> within 24 to 48 hours.
                  </p>
                </div>
                <button
                  onClick={closeInquiry}
                  className="mt-4 border border-border-subtle px-6 py-2.5 text-[10px] uppercase tracking-widest hover:border-foreground transition-colors font-medium"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
