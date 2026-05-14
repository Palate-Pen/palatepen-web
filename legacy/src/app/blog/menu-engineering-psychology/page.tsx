import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function MenuPsychPost() {
  return (
    <main>
      <Nav />
      <article>
        <header className="bg-ink pt-32 pb-24 px-6 md:px-14">
          <div className="max-w-3xl mx-auto">
            <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal block mb-6">Menu Design</span>
            <h1 className="font-fraunces font-light text-cream leading-tight mb-8" style={{fontSize:'clamp(32px,5vw,60px)'}}>
              The psychology of menu design — how layout drives orders
            </h1>
            <p className="font-fraunces italic text-xl text-slate border-l-2 border-mustard pl-5 leading-relaxed">
              Where you place a dish on a menu determines how often it gets ordered. The science behind this is fascinating, learnable, and directly actionable.
            </p>
            <p className="font-epilogue text-sm text-white/30 mt-8">May 2026 &middot; Palate &amp; Pen</p>
          </div>
        </header>

        <div className="bg-cream py-20 px-6 md:px-14">
          <div className="max-w-3xl mx-auto font-epilogue font-light text-base text-slate leading-relaxed space-y-6">

            <p>When a guest opens your menu, they are not reading it. They are scanning it. Research consistently shows that diners spend an average of 109 seconds looking at a menu before making a decision. In that time, they are not absorbing every dish. They are following patterns — patterns that good menu design understands and uses.</p>

            <p>This is not manipulation. It is design. And it is the difference between a menu that works hard for your business and one that just lists what is in the kitchen.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">Where the eye goes first</h2>

            <p>Studies of eye movement on menus consistently find a pattern called the ‘sweet spot’ — the area of the menu that gets the most attention in the first few seconds of reading. On a single-page menu, it is the upper right corner. On a two-page spread, it is the centre and the top of the right-hand page.</p>

            <p>Whatever you put in those positions gets ordered more. Not because it is better food, but because it is what people see first. Chefs and operators who understand this place their highest-GP dishes there, and they watch the numbers move.</p>

            <p>The corollary is equally important: the bottom-left corner of any menu is the weakest position. If you have a dish that is difficult to sell but you cannot remove it — for contractual reasons, or because it is a staff favourite — put it there.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">The anchor effect</h2>

            <p>Pricing on a menu is relative, not absolute. Guests do not have an innate sense of what a starter should cost — they form that sense by looking at the other starters around it. This is called anchoring, and it is one of the most powerful tools in menu design.</p>

            <p>If you want to sell a £14 starter, put a £19 starter next to it. The £14 dish immediately looks like good value. If the £14 dish is surrounded by £8 and £9 starters, it reads as expensive.</p>

            <p>This does not mean padding your menu with overpriced dishes nobody orders. It means being strategic about how prices sit relative to each other, and using that strategy to point guests towards the dishes you most want them to order.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">The tyranny of choice</h2>

            <p>There is a point at which choice stops being a selling point and becomes a problem. The psychologist Barry Schwartz called it the paradox of choice — the more options people have, the less satisfied they tend to be with the one they pick, because they are always aware of everything they did not choose.</p>

            <p>On a menu, too many dishes creates anxiety. Guests become overwhelmed, default to familiar options, and leave feeling less satisfied than they would have with a shorter, more focused offering. The classic example is the gastro pub menu with forty dishes — it signals to the guest that nothing is done particularly well.</p>

            <p>The number you will hear most often from menu engineers is seven. Research suggests that seven options per category is the point at which guests begin to feel overwhelmed. Under that number, the menu feels considered and confident. Over it, it starts to feel like a hedge.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">Words that sell</h2>

            <p>The language on a menu does more than describe a dish. It creates expectation, builds appetite, and tells the guest something about the kitchen that made it.</p>

            <p>Research by Dr. Brian Wansink at Cornell found that descriptive menu labels — ‘slow-roasted Hereford beef’ rather than just ‘roast beef’ — increased both perceived quality and sales by around 27%. Guests felt the food tasted better and were more likely to order it again.</p>

            <p>The lesson is not to write flowery prose for every dish. It is to be specific rather than generic. Name your suppliers where it matters. Use the provenance of your ingredients when it adds something. Describe the technique when it tells the guest what to expect. A dish described as ‘twice-cooked duck leg, braised white beans, gremolata’ tells me more, and makes me more confident in ordering it, than ‘duck leg with beans.’</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">The currency symbol problem</h2>

            <p>This is a small detail with a measurable effect. Studies consistently show that menus without currency symbols — writing ‘14.00’ rather than ‘£14.00’ — lead to higher spend. The symbol activates what researchers call ‘pain of paying’ thinking. Removing it does not trick anyone, but it does reduce the moment of hesitation.</p>

            <p>Similarly, listing prices in a column down the right-hand side of a menu — the format you see in most printed menus — invites guests to scan the prices and make decisions based on them. Embedding the price at the end of the dish description, without visual alignment, reduces price-led ordering.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">What this means in practice</h2>

            <p>You do not need to redesign your entire menu based on eye-tracking studies and psychology research. But you should know where your highest-GP dishes are sitting on the page, and whether they are in positions that work for them.</p>

            <p>Start by printing your menu and drawing a box around the upper right area. Look at what is in there. Is it the dish you most want to sell? If not, think about whether you can move things.</p>

            <p>Then look at your pricing structure. Are your anchor dishes in the right place? Is the price hierarchy working in your favour?</p>

            <p>Then look at your descriptions. Are you being specific or generic? Are you using your ingredients and your provenance, or hiding them behind vague language?</p>

            <p>Good menu design is not about making a beautiful document. It is about making a tool that sells your food. Those are related, but they are not the same thing.</p>

          </div>
        </div>

        <div className="bg-paper border-t border-ink/10 py-16 px-6 md:px-14">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-3">Want a menu audit?</p>
              <p className="font-fraunces font-light text-2xl text-ink mb-4">We review your menu and tell you exactly what to change and why.</p>
              <Link href="/contact" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-6 py-3 hover:bg-teal transition-colors">Get in Touch</Link>
            </div>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}