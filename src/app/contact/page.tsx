'use client';
import { useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <main>
      <Nav />
      <section className="bg-ink pt-32 pb-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
          <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-teal mb-4">Contact</p>
          <h1 className="font-fraunces font-light text-cream leading-tight" style={{fontSize:'clamp(40px,7vw,80px)'}}>
            Start a <i className="text-mustard">conversation</i>
          </h1>
        </div>
      </section>

      <section className="bg-cream py-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="font-epilogue font-light text-base text-slate leading-relaxed mb-10">
              Whether you need a new menu, a GP review, kitchen operations support, or want to know more about Mise — get in touch and we will respond within 24 hours.
            </p>
            <div className="space-y-6">
              <div className="border-t border-ink/10 pt-5">
                <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-1">Email</p>
                <p className="font-fraunces font-light text-lg text-ink">hello@palateandpen.co.uk</p>
              </div>
              <div className="border-t border-ink/10 pt-5">
                <p className="font-epilogue text-xs font-bold tracking-widests uppercase text-teal mb-1">Location</p>
                <p className="font-fraunces font-light text-lg text-ink">London, UK &mdash; Remote available</p>
              </div>
              <div className="border-t border-ink/10 pt-5">
                <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-1">Instagram</p>
                <a href="https://instagram.com/palate.pen" target="_blank" rel="noopener noreferrer" className="font-fraunces font-light text-lg text-mustard hover:text-ink transition-colors">@palate.pen</a>
              </div>
            </div>
          </div>

          {sent ? (
            <div className="flex items-center justify-center bg-paper border border-ink/5 p-12">
              <div className="text-center">
                <div className="w-12 h-12 bg-teal rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-xl">&#10003;</span>
                </div>
                <h3 className="font-fraunces font-light text-2xl text-ink mb-3">Message sent</h3>
                <p className="font-epilogue font-light text-sm text-slate">We will be in touch within 24 hours.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {[['Your Name','name','text','e.g. Jack Smith'],['Email Address','email','email','hello@example.com'],['Subject','subject','text','e.g. Menu design enquiry']].map(([label,name,type,ph]) => (
                <div key={name}>
                  <label className="font-epilogue text-xs font-bold tracking-widest uppercase text-slate block mb-2">{label}</label>
                  <input type={type} required value={(form as any)[name]} onChange={e => setForm({...form, [name]: e.target.value})} placeholder={ph}
                    className="w-full bg-paper border border-ink/10 px-4 py-3 font-epilogue text-sm text-ink focus:outline-none focus:border-mustard transition-colors" />
                </div>
              ))}
              <div>
                <label className="font-epilogue text-xs font-bold tracking-widest uppercase text-slate block mb-2">Message</label>
                <textarea required rows={5} value={form.message} onChange={e => setForm({...form, message:e.target.value})}
                  placeholder="Tell us about your project..."
                  className="w-full bg-paper border border-ink/10 px-4 py-3 font-epilogue text-sm text-ink focus:outline-none focus:border-mustard transition-colors resize-none" />
              </div>
              <button type="submit" disabled={loading}
                className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-8 py-4 hover:bg-teal transition-colors disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}