import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function GPPost() {
  return (
    <main>
      <Nav />
      <article>
        <header className="bg-ink pt-32 pb-24 px-6 md:px-14">
          <div className="max-w-3xl mx-auto">
            <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal block mb-6">Business</span>
            <h1 className="font-fraunces font-light text-cream leading-tight mb-8" style={{fontSize:'clamp(32px,5vw,60px)'}}>
              GP margins explained — what every chef needs to know
            </h1>
            <p className="font-fraunces italic text-xl text-slate border-l-2 border-mustard pl-5 leading-relaxed">
              Understanding gross profit is the single most important business skill a chef can develop. Here is a plain-English guide to the numbers that determine whether a kitchen thrives or fails.
            </p>
            <p className="font-epilogue text-sm text-white/30 mt-8">May 2026 &middot; Palate &amp; Pen</p>
          </div>
        </header>

        <div className="bg-cream py-20 px-6 md:px-14">
          <div className="max-w-3xl mx-auto font-epilogue font-light text-base text-slate leading-relaxed space-y-6">

            <p>Most chefs can tell you exactly what goes into a dish. The ratio of butter to stock in a beurre blanc. The resting time on a bavette. The precise point at which a custard catches. What far fewer chefs can tell you is the gross profit percentage on that same dish — and that gap is one of the biggest reasons hospitality businesses fail.</p>

            <p>This is not a criticism. Culinary training does not cover the numbers. Most kitchens run on instinct and experience, and many brilliant chefs have never been given the tools to understand the financial side of what they do. That changes today.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">What is gross profit, exactly?</h2>

            <p>Gross profit (GP) is the money left over from a sale after you have paid for the ingredients. If a dish sells for £18 and the ingredients cost £4.50, your GP is £13.50 — which is a GP percentage of 75%.</p>

            <p>The formula is simple: <span className="text-ink font-medium">GP% = (Sell price – Food cost) ÷ Sell price × 100</span></p>

            <p>That percentage is the number that matters. It tells you what proportion of every pound that comes through the pass is available to cover your labour, your rent, your utilities, and everything else that keeps the business running. The higher the GP, the more breathing room you have. The lower it is, the less margin for error.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">What should your GP be?</h2>

            <p>There is no universal answer, because it depends entirely on your business model. A fine dining restaurant with a small brigade and very high covers can operate profitably at 72%. A contract catering operation serving 500 lunches a day needs to be closer to 68-70% to cover its labour model. A quick service operation might target 60-65%.</p>

            <p>The industry standard you will hear most often is 65-70%. That is the range most casual dining and pub restaurant operators aim for. If you are consistently below 60%, you are likely losing money on your food before you have paid a single member of staff.</p>

            <p>But here is the thing: knowing your overall GP is only the start. The interesting work happens when you look dish by dish.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">The dish level is where it gets useful</h2>

            <p>Your menu is not a single product. It is a collection of individual dishes, each with its own cost, its own selling price, and its own GP. Some of those dishes are carrying the rest. Some are quietly pulling your overall margin down. Most operators have no idea which is which.</p>

            <p>The classic example: a kitchen runs a steak dish at 58% GP because the beef is expensive, but it is their best seller. Meanwhile, a pasta dish at 78% barely gets ordered. The steak is costing them money every time it goes out; the pasta is printing it. Understanding this allows you to make decisions — about pricing, about portion size, about which dishes to promote on the menu and which to quietly retire.</p>

            <p>This is menu engineering, and it starts with knowing your GP at dish level.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">The three levers</h2>

            <p>If your GP is not where you need it to be, there are only three ways to fix it: increase your selling prices, reduce your food costs, or change your dish mix.</p>

            <p>Increasing prices is the most straightforward, but it has limits — particularly in competitive markets where your guests have options. A well-engineered price increase on the right dishes, presented clearly on a well-designed menu, is rarely as damaging as operators fear. But a blanket 10% price rise on everything tends to feel crude and gets noticed.</p>

            <p>Reducing food costs requires discipline. Better supplier relationships. Less waste. More precise portioning. Seasonal menus that take advantage of what is cheap and abundant rather than fighting it. This is operational work, and it compounds over time.</p>

            <p>Changing your dish mix is the subtlest and most powerful lever. If you can get more guests to order your high-GP dishes and fewer to order your low-GP ones — through menu design, through how your front of house team talks about the food, through which dishes your chef recommends — your overall GP improves without changing a single price or ingredient.</p>

            <h2 className="font-fraunces font-light text-3xl text-ink pt-6">The practical starting point</h2>

            <p>You do not need a spreadsheet or an accountant to get started. You need three numbers for every dish on your menu: what it sells for, what the ingredients cost, and how many you sell in a week.</p>

            <p>From those three numbers, you can calculate your GP per dish, identify your best and worst performers, and start making decisions. The Mise app was built to make exactly this kind of calculation fast and accessible — input your ingredients, your quantities, your unit costs, and it does the maths.</p>

            <p>Start with your five best-selling dishes. Cost them properly. Calculate their GP. Then have an honest look at whether your menu is as profitable as it should be.</p>

            <p>The answer will probably surprise you.</p>

          </div>
        </div>

        <div className="bg-paper border-t border-ink/10 py-16 px-6 md:px-14">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-3">Want help with your GP?</p>
              <p className="font-fraunces font-light text-2xl text-ink mb-4">We offer GP analysis and menu engineering as a standalone service.</p>
              <Link href="/contact" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-6 py-3 hover:bg-teal transition-colors">Get in Touch</Link>
            </div>
            <div>
              <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-3">Try it yourself</p>
              <p className="font-epilogue font-light text-sm text-slate leading-relaxed mb-4 max-w-xs">The Mise app has a built-in GP calculator. Cost any dish in minutes.</p>
              <Link href="/mise/app" className="font-epilogue text-xs font-semibold tracking-widest uppercase border border-ink text-ink px-6 py-3 hover:bg-ink hover:text-cream transition-colors">Open Mise App</Link>
            </div>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}