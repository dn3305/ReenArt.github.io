'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function AboutPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormSubmitted(true);
        setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
      } else {
        setFormError(data.error || 'Failed to send your message. Please try again.');
      }
    } catch (err) {
      setFormError('Failed to send your message. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exhibitions = [
    { year: '2026', title: 'Whispers of Color (Solo)', location: 'Ramprastha Gallery, Vaishali' },
    { year: '2025', title: 'A Touch of Gold (Group)', location: 'India Art Fair, New Delhi' },
    { year: '2025', title: 'Harmony in Contrast (Solo)', location: 'The Studio, Vaishali' },
    { year: '2024', title: 'Ethereal Brushstrokes (Group)', location: 'Contemporary Art Fest, Mumbai' }
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 animate-fade-in flex-1 flex flex-col justify-start">
      {/* Intro Header */}
      <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto mb-16">
        <span className="text-[10px] tracking-[0.4em] uppercase text-accent font-medium">The Artist</span>
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-wide text-foreground">
          About Nazia
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
        {/* Left Column: Portrait */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Image
              src="/images/profile.jpg"
              alt="Nazia Naureen"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover grayscale brightness-95 dark:brightness-75 hover:grayscale-0 transition-all duration-700 ease-out"
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[10px] tracking-widest uppercase text-muted">Studio Location</span>
              <div className="text-xs font-light text-foreground tracking-wide mt-1">
                Ramprastha Greens, Vaishali, India<br/>
                <span className="text-muted">Near Vaishali Metro · Open by Appointment</span>
              </div>
            </div>
            <div className="flex gap-4 mt-1">
              <a
                href="https://www.instagram.com/reenart_/"
                target="_blank" rel="noreferrer"
                className="text-[10px] tracking-widest uppercase text-accent hover:text-foreground transition-colors"
              >
                Instagram ↗
              </a>
              <a
                href="https://www.youtube.com/@reenart201"
                target="_blank" rel="noreferrer"
                className="text-[10px] tracking-widest uppercase text-accent hover:text-foreground transition-colors"
              >
                YouTube ↗
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Bio, Exhibitions, and Contact Form */}
        <div className="lg:col-span-7 flex flex-col gap-16">
          {/* Biography & Philosophy */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 text-sm font-light text-muted leading-relaxed tracking-wide">
              <h2 className="font-serif text-2xl text-foreground font-light tracking-wide">Biography</h2>
              <p>
                Nazia Naureen is an Indian abstract artist whose work is a vivid reflection of her imagination, emotions, and life&apos;s struggles. Deeply inspired by the complexities of the human experience, she channels her inner world onto the canvas, using bold colors and dynamic forms to convey the depth of her feelings.
              </p>
              <p>
                Each piece is an exploration of her personal journey, where joy, pain, resilience, and hope converge in abstract expression. Her art serves as a visual diary, allowing her to communicate what words cannot, and inviting viewers to connect with the emotional energy that infuses her work.
              </p>
              <p>
                Drawing from her rich cultural heritage and personal experiences, Nazia weaves stories of strength and vulnerability into her abstract compositions. She believes that art has the power to heal, transform, and inspire — offering a space for contemplation and connection through a powerful means of self-expression and storytelling.
              </p>
            </div>

            <div className="flex flex-col gap-4 text-sm font-light text-muted leading-relaxed tracking-wide">
              <h2 className="font-serif text-2xl text-foreground font-light tracking-wide">Artist Statement</h2>
              <p className="italic border-l border-accent/40 pl-6 py-1 font-serif text-base text-accent">
                &ldquo;Abstract art is the language of the soul, where every brushstroke speaks the unspoken and every color reveals the unseen.&rdquo;
              </p>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-3 pt-2">
              <h2 className="font-serif text-2xl text-foreground font-light tracking-wide">Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted tracking-wide">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-accent mb-1">Email</div>
                  <a href="mailto:naureennaz00@gmail.com" className="hover:text-foreground transition-colors">naureennaz00@gmail.com</a>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-accent mb-1">Website</div>
                  <a href="https://reenart.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">reenart.com</a>
                </div>
              </div>
            </div>
          </div>

          {/* Exhibitions */}
          <div className="flex flex-col gap-6">
            <h2 className="font-serif text-2xl text-foreground font-light tracking-wide">Selected Exhibitions</h2>
            <div className="border-t border-border-subtle">
              {exhibitions.map((ex, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-baseline py-4 border-b border-border-subtle text-xs tracking-wide"
                >
                  <span className="text-[10px] text-accent uppercase tracking-widest font-medium w-16 shrink-0">{ex.year}</span>
                  <span className="font-serif text-foreground font-light flex-1">{ex.title}</span>
                  <span className="text-muted font-light">{ex.location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form Container */}
          <div className="border-t border-border-subtle pt-12 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 className="font-serif text-2xl text-foreground font-light tracking-wide">Studio Inquiries</h2>
              <p className="text-xs font-light text-muted tracking-wide">
                For sales, commissions, exhibition booking, or studio visits, fill out the form below.
              </p>
            </div>

            {!formSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {formError && (
                  <div className="border border-red-400/40 bg-red-500/10 text-red-400 text-xs tracking-wide px-4 py-3">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Your Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Arjun Sharma"
                      className="w-full h-10 border border-white/10 bg-white/5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] px-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Your Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. arjun@example.com"
                      className="w-full h-10 border border-white/10 bg-white/5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] px-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Inquiry Type *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full h-10 border border-white/10 bg-white/5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] px-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Artwork Acquisition">Artwork Acquisition</option>
                    <option value="Commission Request">Custom Commission</option>
                    <option value="Press / Exhibition">Press or Exhibition Booking</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-muted font-medium">Message *</label>
                  <textarea
                    required
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your inquiry..."
                    className="w-full border border-white/10 bg-white/5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-3 text-xs tracking-wide focus:border-accent focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-12 px-12 border border-foreground bg-foreground text-background text-xs uppercase tracking-widest font-medium hover:bg-transparent hover:text-foreground disabled:opacity-50 transition-all duration-300 self-start"
                >
                  {isSubmitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-6 border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-8">
                <div className="w-12 h-12 rounded-full border border-accent bg-accent/5 flex items-center justify-center text-accent text-xl font-light">
                  ✓
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-serif text-xl font-light tracking-wide text-foreground">Message Sent</h3>
                  <p className="text-xs font-light text-muted leading-relaxed max-w-md tracking-wide">
                    Thank you. Your message has been received by Nazia's studio. You will receive a response within 2 business days.
                  </p>
                </div>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className="border border-border-subtle px-6 py-2.5 text-[10px] uppercase tracking-widest hover:border-foreground transition-colors font-medium"
                >
                  Send Another Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
