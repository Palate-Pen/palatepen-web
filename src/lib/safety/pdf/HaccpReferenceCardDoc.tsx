import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import type {
  HaccpBody,
  HaccpCcp,
  HaccpPlan,
} from '@/lib/safety/haccp';

/**
 * One-page reference card for the kitchen wall — every CCP + its
 * critical limit + its monitoring touchpoint, at a glance. Designed
 * to be laminated next to the pass.
 */
export function HaccpReferenceCardDoc({
  plan,
  siteName,
}: {
  plan: HaccpPlan;
  siteName: string;
}) {
  const body: HaccpBody = plan.body ?? {};
  const step3 = body.step_3 ?? {};
  const step4 = body.step_4 ?? {};
  const tradingName =
    (body.step_1?.trading_name as string | undefined) ?? siteName ?? '—';

  const ccps = (step3.ccps ?? []) as HaccpCcp[];
  const limits = (step4.critical_limits ?? []) as Array<{
    ccp_id: string;
    parameter: string;
    operator: string;
    min_value: string;
    max_value: string;
    unit: string;
    reference: string;
  }>;

  return (
    <Document
      title={`${tradingName} — HACCP reference card`}
      author="Palatable"
    >
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <View style={pdfStyles.headerBar}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={pdfStyles.brandWord}>PALATABLE</Text>
            <Text style={pdfStyles.brandDot}> ·</Text>
          </View>
          <Text style={pdfStyles.docMeta}>
            REFERENCE CARD · KITCHEN WALL
          </Text>
        </View>

        <Text style={pdfStyles.title}>
          <Text>{tradingName} — </Text>
          <Text style={pdfStyles.titleEm}>CCPs at a glance.</Text>
        </Text>
        <Text style={pdfStyles.subtitle}>
          Print, laminate, mount next to the pass. Every Critical Control
          Point with its critical limit. If a reading lands outside the
          limit, stop and follow the corrective action in the plan.
        </Text>

        {ccps.length === 0 ? (
          <Text style={pdfStyles.bodySoft}>
            (No CCPs defined yet. Complete HACCP Step 3 to populate.)
          </Text>
        ) : (
          ccps.map((c) => {
            const l = limits.find((x) => x.ccp_id === c.id);
            const limitDisplay = l
              ? `${l.operator} ${l.min_value || l.max_value}${l.unit ? ' ' + l.unit : ''}`
              : c.critical_limit || '—';
            return (
              <View
                key={c.id}
                style={[pdfStyles.card, { paddingVertical: 14 }]}
                wrap={false}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={[pdfStyles.cardTitle, { fontSize: 14 }]}>
                    {c.name || 'Unnamed CCP'}
                  </Text>
                  <Text
                    style={[
                      pdfStyles.kvKey,
                      { width: 'auto', fontSize: 10, letterSpacing: 1.4 },
                    ]}
                  >
                    {limitDisplay}
                  </Text>
                </View>
                {c.justification && (
                  <Text
                    style={[pdfStyles.bodySoft, { marginTop: 4, fontSize: 9 }]}
                  >
                    {c.justification}
                  </Text>
                )}
                {l?.reference && (
                  <Text style={pdfStyles.metaLine}>{l.reference}</Text>
                )}
              </View>
            );
          })
        )}

        <View style={pdfStyles.footerStrip} fixed>
          <Text style={pdfStyles.footerLeft}>
            {tradingName.toUpperCase()} · HACCP REFERENCE CARD
          </Text>
          <Text style={pdfStyles.footerRight}>
            EHO copy lives in the main HACCP plan PDF
          </Text>
        </View>
      </Page>
    </Document>
  );
}
