import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function StockPost() {
  return (
    <main>
      <Nav />
      <article>
        <header className="bg-ink pt-32 pb-24 px-6 md:px-14">
          <div className="max-w-3xl mx-auto">
            <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal block mb-6">Kitchen Ops</span>
            <h1 className="font-fraunces font-light text-cream leading-tight mb-8" style={{fontSize:'clamp(32px,5vw,60px)'}}>
              Stock counting made simple — the system that actually works
            </h1>
            <p className="font-fraunces italic text-xl text-slate border-l-2 border-mustard pl-5 leading-relaxed">
              A par level system paired with a weekly count takes 20 minutes and eliminates the guesswork from ordering. Here is exactly how to set it up.
            </p>
            <p className="font-epilogue text-sm text-white/30 mt-8">May 2026 &middot; Palate &amp; Pen</p>
          </div>
        </header>

        <div className="bg-cream py-20 px-6 md:px-14">
          <div className="max-w-3xl mx-auto font-epilogue font-light text-base text-slate leading-relaxed space-y-6">

            <p>Ask most chefs how much salmon they have in the fridge and you will get an approximation. A vague gesture toward the bottom shelf. A rough estimate based on what they think they ordered and what they think they have used. Maybe a number with a qualifier: ‘should be about four kilos, I think.’</p>

            <p>This is not a character flaw. It is the natural result of a kitchen that has never been given a proper stock counting system. And the cost of it — in over-ordering, in waste, in running out of things mid-service — adds up to a significant amount of money over a year.</p>

            <p>The good news is that the system that fixes this is not complicated. It takes about twenty minutes a week once it is set up, and it pays for that time many times over.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">What a par level system is</h2>

            <p>A par level is the quantity of an ingredient you want to have on hand at all times. It is the answer to the question: how much of this do I need to have in stock to be confident I can get through the week without running out?</p>

            <p>For each ingredient on your order guide, you set two numbers: a par level (the ideal quantity) and a minimum level (the trigger point at which you must order). When your stock count shows you are at or below the minimum, you order enough to get back to par.</p>

            <p>The system is as simple as that. The discipline is in doing the count regularly and acting on what it tells you.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">Setting your par levels</h2>

            <p>Start with your order guide — the list of ingredients you buy regularly. For each ingredient, think about two things: how much you use in a typical week, and how often your supplier delivers.</p>

            <p>If you use 5kg of salmon a week and your supplier delivers twice a week, your par level might be 3kg — enough to cover a delivery period with a small buffer. Your minimum level might be 1kg — the point at which you call in an emergency order.</p>

            <p>For dry goods and ambient products, your par levels can be higher. If olive oil is delivered monthly, you need to hold enough for a month plus a buffer. For produce that arrives daily, you can run much leaner.</p>

            <p>Do not agonise over getting the numbers perfect on day one. Set them based on your best estimate, run the system for a few weeks, and adjust. You will quickly learn which ingredients you have set too high (they accumulate) and which too low (you keep running out).</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">Running the count</h2>

            <p>Pick a consistent time for your weekly stock count. Most kitchens do it before the first delivery of the week — usually Monday morning or Sunday evening. The consistency matters more than the timing.</p>

            <p>Go through every ingredient on your list and record the actual quantity on hand. Do not estimate. Weigh what needs weighing. Count what needs counting. Open the fridges, check the dry store, look in the prep fridge.</p>

            <p>This is the part that most kitchen teams resist, because it feels time-consuming. In practice, once your team knows the list and the locations, a full count of a restaurant kitchen’s key ingredients takes fifteen to twenty minutes. That is a small price to pay for knowing exactly where you stand.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">What the data tells you</h2>

            <p>After a few weeks of consistent counting, patterns start to emerge. You will see which ingredients you consistently over-order. You will spot the products where usage varies significantly week to week and understand why. You will notice when something is disappearing faster than it should — which can indicate a portion control problem, a waste issue, or occasionally something more concerning.</p>

            <p>The stock count is not just an ordering tool. It is a diagnostic. It tells you things about your kitchen that you cannot see any other way.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">The connection to GP</h2>

            <p>Stock management and gross profit are directly connected. Over-ordering leads to waste, which inflates your food cost. Under-ordering leads to emergency purchases from expensive sources, which also inflates your food cost. Both damage your GP in ways that are invisible until you look at the numbers.</p>

            <p>A kitchen that counts its stock weekly and orders against par levels typically runs 2-4% lower food cost than a kitchen that orders on instinct. On a business turning over £500,000 a year in food and beverage, that is £10,000 to £20,000 in additional profit.</p>

            <p>That is not a small number. And it comes from twenty minutes a week and a list on a clipboard.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">Getting started today</h2>

            <p>You do not need software or a complicated system to start. You need a list of your key ingredients, a set of par levels you have thought about, and a commitment to doing a count once a week.</p>

            <p>Write your ingredient list. Set your par levels. Do your first count this week. Record the numbers. Use them to build your order. Then do it again next week.</p>

            <p>After a month, you will wonder how you managed without it.</p>

            <p>The Mise app includes a stock counter that does exactly this — set your par and minimum levels per ingredient, run your count, and see at a glance what is good, what is low, and what is critical. It is built for how kitchens actually work.</p>

          </div>
        </div>

        <div className="bg-paper border-t border-ink/10 py-16 px-6 md:px-14">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-3">Need help with kitchen ops?</p>
              <p className="font-fraunces font-light text-2xl text-ink mb-4">We work directly with kitchen teams to build the systems that make great cooking possible.</p>
              <Link href="/contact" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-6 py-3 hover:bg-teal transition-colors">Get in Touch</Link>
            </div>
            <div>
              <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-3">Try the stock counter</p>
              <p className="font-epilogue font-light text-sm text-slate leading-relaxed mb-4 max-w-xs">Mise has a built-in stock counter with par levels. Free to try.</p>
              <Link href="/mise/app" className="font-epilogue text-xs font-semibold tracking-widest uppercase border border-ink text-ink px-6 py-3 hover:bg-ink hover:text-cream transition-colors">Open Mise App</Link>
            </div>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}