import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function ContactPage() {
  return (
    <main>
      <Nav />
      <section className="pt-32 pb-24 px-6 md:px-14">
        <div className="max-w-2xl mx-auto">
          <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-4">Get in Touch</p>
          <h1 className="font-fraunces font-light text-5xl text-ink mb-6">Start a <i className="text-mustard">conversation</i></h1>
          <p className="font-epilogue font-light text-base text-slate leading-relaxed mb-16">
            Whether you need a new menu, a GP review, kitchen operations support, or want to know more about Mise — get in touch and we will respond within 24 hours.
          </p>
          <div className="space-y-6">
            {[['Your Name','text'],['Email Address','email'],['Subject','text']].map(([label,type])=>(
              <div key={label}>
                <label className="font-epilogue text-xs font-bold tracking-widest uppercase text-slate block mb-2">{label}</label>
                <input type={type} className="w-full bg-paper border border-ink/10 px-4 py-3 font-epilogue text-sm text-ink focus:outline-none focus:border-mustard transition-colors" />
              </div>
            ))}
            <div>
              <label className="font-epilogue text-xs font-bold tracking-widest uppercase text-slate block mb-2">Message</label>
              <textarea rows={6} className="w-full bg-paper border border-ink/10 px-4 py-3 font-epilogue text-sm text-ink focus:outline-none focus:border-mustard transition-colors resize-none" />
            </div>
            <button className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-8 py-4 hover:bg-teal transition-colors">
              Send Message
            </button>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}