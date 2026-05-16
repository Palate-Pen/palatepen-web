import { getShellContext } from '@/lib/shell/context';
import { listStockTakes } from '@/lib/stock-takes';
import { StockCountList } from '@/components/stock-count/StockCountList';

export const metadata = { title: 'Stock Take — Bar — Palatable' };

export default async function BarStockTakeListPage() {
  const ctx = await getShellContext();
  const rows = await listStockTakes(ctx.siteId);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Back Bar · The Honest Count
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-8">
        Stock <em className="text-gold font-semibold not-italic">Take</em>
      </h1>

      <StockCountList
        rows={rows}
        defaultScope="bar"
        basePath="/bartender/back-bar/stock-take"
        detailHref={(id) => `/bartender/back-bar/stock-take/${id}`}
      />
    </div>
  );
}
