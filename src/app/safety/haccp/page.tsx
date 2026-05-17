import { HaccpLiabilityFooter } from '@/components/safety/HaccpLiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { SafetyPageHeader } from '@/components/safety/SafetyPageHeader';
import { HaccpWizardClient } from '@/components/safety/HaccpWizardClient';
import { getShellContext } from '@/lib/shell/context';
import { getHaccpPlan, getHaccpPrefill } from '@/lib/safety/haccp';
import { getDishPickerBands } from '@/lib/safety/dish-picker';

export const metadata = { title: 'HACCP Wizard · Safety · Palatable' };

export default async function HaccpPage() {
  const ctx = await getShellContext();
  const [plan, prefill, bands] = await Promise.all([
    getHaccpPlan(ctx.siteId),
    getHaccpPrefill(ctx.siteId),
    getDishPickerBands(ctx.siteId, 'food'),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="HACCP Wizard"
        title="Build your"
        titleEm="HACCP plan"
        subtitle="UK food safety law requires a written plan based on HACCP principles. Nine steps, pre-filled from what Palatable already knows about your kitchen."
      />

      <HaccpWizardClient
        siteId={ctx.siteId}
        plan={plan}
        prefill={prefill}
        bands={bands}
      />

      <div className="mt-10">
        <FsaReferenceStrip surface="haccp" variant="full" />
      </div>

      <HaccpLiabilityFooter />
    </div>
  );
}
