import type { Metadata } from 'next';
import { ARTWORK_TERMS, ARTWORK_TERMS_TITLE } from '../../lib/artworkTerms';

export const metadata: Metadata = {
  title: `${ARTWORK_TERMS_TITLE} | ReenArt`,
  description: 'Terms for ownership, copyright, usage, licensing, shipping, and refunds for original ReenArt artwork.',
};

export default function TermsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16 md:px-12 md:py-24">
      <span className="text-[10px] tracking-[0.3em] uppercase text-accent font-medium">ReenArt Studio</span>
      <h1 className="mt-3 font-serif text-3xl font-light tracking-wide text-foreground md:text-5xl">{ARTWORK_TERMS_TITLE}</h1>
      <div className="mt-10 flex flex-col gap-7">
        {ARTWORK_TERMS.map((term, index) => (
          <section key={term.title} className="border-b border-white/10 pb-6">
            <h2 className="font-serif text-xl font-light text-foreground">{index + 1}. {term.title}</h2>
            <p className="mt-2 text-sm font-light leading-relaxed tracking-wide text-muted">{term.text}</p>
          </section>
        ))}
      </div>
    </section>
  );
}
