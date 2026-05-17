import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles, s } from './styles';
import { PROBE_KIND_LABEL } from '@/lib/safety/standards';
import type { ProbeReadingRow, IncidentRow, TrainingRow, CleaningTaskRow, OpeningCheckRow } from '@/lib/safety/lib';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function fmtDateOnly(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : dateFmt.format(d);
}
function fmtDateTime(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : dateTimeFmt.format(d);
}

export type EhoBundleData = {
  siteName: string;
  accountName: string;
  windowStart: string;
  windowEnd: string;
  rollup: {
    days_logged: number;
    days_partial: number;
  };
  openingChecks: OpeningCheckRow[];
  probes: ProbeReadingRow[];
  probesIn90: ProbeReadingRow[];
  probesFailing: number;
  incidents: IncidentRow[];
  cleaning: CleaningTaskRow[];
  cleaningDoneToday: number;
  training: TrainingRow[];
  deliveriesArrived: number;
  wasteCount: number;
};

export function EhoBundleDoc({ data }: { data: EhoBundleData }) {
  const incidentsOpen = data.incidents.filter((i) => !i.resolved_at).length;
  const trainingExpired = data.training.filter((t) => t.expiry_band === 'expired').length;
  const trainingWithin30 = data.training.filter((t) =>
    ['today', 'this_week', 'two_weeks', 'month'].includes(t.expiry_band),
  ).length;
  const staffCount = new Set(data.training.map((t) => t.staff_name)).size;

  return (
    <Document
      title={`${data.siteName} — EHO 90-day bundle`}
      author="Palatable"
    >
      {/* ========================= COVER ========================== */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerBar} fixed>
          <View style={{ flexDirection: 'row' }}>
            <Text style={pdfStyles.brandWord}>PALATABLE</Text>
            <Text style={pdfStyles.brandDot}> ·</Text>
          </View>
          <Text style={pdfStyles.docMeta}>
            EHO 90-DAY BUNDLE · {fmtDateOnly(new Date().toISOString())}
          </Text>
        </View>

        <Text style={pdfStyles.title}>
          <Text>{data.siteName} — </Text>
          <Text style={pdfStyles.titleEm}>EHO evidence bundle.</Text>
        </Text>
        <Text style={pdfStyles.subtitle}>
          90 days of food safety records compiled from the live Safety tab.
          {data.windowStart} → {data.windowEnd}.
        </Text>

        <Text style={pdfStyles.sectionLabel}>SUMMARY</Text>
        <Text style={pdfStyles.sectionTitle}>What&apos;s on file.</Text>

        <SummaryRow label="Daily diary" value={`${data.rollup.days_logged} days complete · ${data.rollup.days_partial} partial`} />
        <SummaryRow
          label="Temperature records"
          value={`${data.probesIn90.length} probe readings · ${data.probesFailing} outside spec`}
        />
        <SummaryRow label="Supplier deliveries" value={`${data.deliveriesArrived} arrivals logged`} />
        <SummaryRow
          label="Incident log"
          value={`${data.incidents.length} entries · ${data.incidents.length - incidentsOpen} resolved · ${incidentsOpen} open`}
        />
        <SummaryRow
          label="Cleaning schedule"
          value={`${data.cleaning.length} tasks on schedule · ${data.cleaningDoneToday} done today`}
        />
        <SummaryRow
          label="Training records"
          value={`${data.training.length} certs · ${staffCount} staff · ${trainingExpired} expired · ${trainingWithin30} expiring`}
        />
        <SummaryRow label="Waste log" value={`${data.wasteCount} entries`} />
        <SummaryRow label="Opening checks" value={`${data.openingChecks.length} of 90 days logged`} />

        <Text style={pdfStyles.sectionLabel}>FSA CITATIONS</Text>
        <Text style={pdfStyles.sectionTitle}>Standards referenced.</Text>
        <Text style={pdfStyles.body}>
          Records compiled against UK food safety law: Regulation (EC) 852/2004
          food hygiene requirements; FSA Safer Food, Better Business (SFBB)
          template; FSA allergen guidance (Natasha&apos;s Law / PPDS).
          Probe thresholds match FSA published limits: hot hold ≥63°C,
          chilled storage ≤8°C, cooking core ≥75°C / 30s, freezer ≤−18°C.
        </Text>

        <View style={pdfStyles.liability}>
          <Text style={pdfStyles.liabilityLabel}>NOTICE</Text>
          <Text style={pdfStyles.liabilityBody}>
            This bundle is a verbatim export of the operator&apos;s Safety
            records from Palatable for the period stated. It does not
            constitute legal advice or certification. The Food Business
            Operator named in the records remains fully accountable for
            compliance with UK food safety law.
          </Text>
        </View>

        <View style={pdfStyles.footerStrip} fixed>
          <Text style={pdfStyles.footerLeft}>
            {data.siteName.toUpperCase()} · EHO BUNDLE
          </Text>
          <Text
            style={pdfStyles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `PAGE ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ===================== PROBES =========================== */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerBar} fixed>
          <View style={{ flexDirection: 'row' }}>
            <Text style={pdfStyles.brandWord}>PALATABLE</Text>
            <Text style={pdfStyles.brandDot}> ·</Text>
          </View>
          <Text style={pdfStyles.docMeta}>EHO 90-DAY BUNDLE — PROBES</Text>
        </View>

        <Text style={pdfStyles.sectionLabel}>TEMPERATURE RECORDS</Text>
        <Text style={pdfStyles.sectionTitle}>Probe readings, 90 days.</Text>
        <Text style={pdfStyles.body}>
          <Text style={pdfStyles.bold}>{data.probesIn90.length} readings.</Text>{' '}
          {data.probesFailing} outside FSA spec — flagged below.
        </Text>

        {data.probesIn90.length === 0 ? (
          <Text style={pdfStyles.bodySoft}>(No probe readings in window.)</Text>
        ) : (
          data.probesIn90.slice(0, 80).map((p) => (
            <View key={p.id} style={s(pdfStyles.kvRow, { marginBottom: 3 })}>
              <Text style={[pdfStyles.kvKey, { width: 80 }]}>
                {fmtDateTime(p.logged_at)}
              </Text>
              <Text style={[pdfStyles.kvVal, { width: 90, flex: 0 }]}>
                {PROBE_KIND_LABEL[p.kind as keyof typeof PROBE_KIND_LABEL] ?? p.kind}
              </Text>
              <Text style={[pdfStyles.kvVal, { flex: 1 }]}>
                {p.location} —{' '}
                <Text style={p.passed ? undefined : pdfStyles.bold}>
                  {Number(p.temperature_c).toFixed(1)}°C {p.passed ? '· pass' : '· FAIL'}
                </Text>
              </Text>
            </View>
          ))
        )}
        {data.probesIn90.length > 80 && (
          <Text style={[pdfStyles.bodySoft, { marginTop: 8 }]}>
            (+{data.probesIn90.length - 80} earlier readings on file.)
          </Text>
        )}

        <View style={pdfStyles.footerStrip} fixed>
          <Text style={pdfStyles.footerLeft}>
            {data.siteName.toUpperCase()} · EHO BUNDLE
          </Text>
          <Text
            style={pdfStyles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `PAGE ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ==================== INCIDENTS ========================= */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerBar} fixed>
          <View style={{ flexDirection: 'row' }}>
            <Text style={pdfStyles.brandWord}>PALATABLE</Text>
            <Text style={pdfStyles.brandDot}> ·</Text>
          </View>
          <Text style={pdfStyles.docMeta}>EHO 90-DAY BUNDLE — INCIDENTS</Text>
        </View>

        <Text style={pdfStyles.sectionLabel}>INCIDENT LOG</Text>
        <Text style={pdfStyles.sectionTitle}>Complaints, allergens, near-miss, illness.</Text>
        <Text style={pdfStyles.body}>
          <Text style={pdfStyles.bold}>{data.incidents.length} entries.</Text>{' '}
          {data.incidents.length - incidentsOpen} resolved, {incidentsOpen} open.
        </Text>

        {data.incidents.length === 0 ? (
          <Text style={pdfStyles.bodySoft}>(No incidents in window.)</Text>
        ) : (
          data.incidents.map((i) => (
            <View key={i.id} style={pdfStyles.card} wrap={false}>
              <Text style={pdfStyles.cardTitle}>
                {i.kind.toUpperCase().replace('_', ' ')} — {i.summary || '(no summary)'}
              </Text>
              <Text style={pdfStyles.metaLine}>
                Occurred {fmtDateTime(i.occurred_at)}
                {i.resolved_at ? ` · resolved ${fmtDateTime(i.resolved_at)}` : ' · STILL OPEN'}
              </Text>
              {i.allergens && i.allergens.length > 0 && (
                <Text style={pdfStyles.metaLine}>
                  Allergens: {i.allergens.join(', ')}
                </Text>
              )}
              {i.body_md && (
                <Text style={[pdfStyles.bodySoft, { marginTop: 4 }]}>
                  {i.body_md.slice(0, 600)}
                  {i.body_md.length > 600 ? '…' : ''}
                </Text>
              )}
            </View>
          ))
        )}

        <View style={pdfStyles.footerStrip} fixed>
          <Text style={pdfStyles.footerLeft}>
            {data.siteName.toUpperCase()} · EHO BUNDLE
          </Text>
          <Text
            style={pdfStyles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `PAGE ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ================ CLEANING + TRAINING ==================== */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerBar} fixed>
          <View style={{ flexDirection: 'row' }}>
            <Text style={pdfStyles.brandWord}>PALATABLE</Text>
            <Text style={pdfStyles.brandDot}> ·</Text>
          </View>
          <Text style={pdfStyles.docMeta}>EHO 90-DAY BUNDLE — CLEANING + TRAINING</Text>
        </View>

        <Text style={pdfStyles.sectionLabel}>CLEANING SCHEDULE</Text>
        <Text style={pdfStyles.sectionTitle}>SFBB-aligned tasks.</Text>
        {data.cleaning.length === 0 ? (
          <Text style={pdfStyles.bodySoft}>(No cleaning schedule on file.)</Text>
        ) : (
          data.cleaning.slice(0, 30).map((c) => (
            <View key={c.id} style={s(pdfStyles.kvRow, { marginBottom: 3 })}>
              <Text style={[pdfStyles.kvKey, { width: 90 }]}>
                {c.frequency.toUpperCase()}
              </Text>
              <Text style={[pdfStyles.kvVal, { flex: 1 }]}>
                <Text style={pdfStyles.bold}>{c.area}</Text> — {c.task}
              </Text>
              <Text
                style={[
                  pdfStyles.metaLine,
                  { width: 100, textAlign: 'right' },
                ]}
              >
                {c.last_completed_at
                  ? `Last ${fmtDateOnly(c.last_completed_at)}`
                  : 'Not yet ticked'}
              </Text>
            </View>
          ))
        )}

        <Text style={pdfStyles.sectionLabel}>TRAINING RECORDS</Text>
        <Text style={pdfStyles.sectionTitle}>Staff certifications.</Text>
        {data.training.length === 0 ? (
          <Text style={pdfStyles.bodySoft}>(No training records on file.)</Text>
        ) : (
          data.training.map((t) => (
            <View key={t.id} style={s(pdfStyles.kvRow, { marginBottom: 3 })}>
              <Text style={[pdfStyles.kvKey, { width: 110 }]}>
                {t.staff_name.toUpperCase()}
              </Text>
              <Text style={[pdfStyles.kvVal, { flex: 1 }]}>
                {t.certificate_name ?? t.kind}
              </Text>
              <Text
                style={[
                  pdfStyles.metaLine,
                  { width: 110, textAlign: 'right' },
                ]}
              >
                {t.expires_on
                  ? `Expires ${fmtDateOnly(t.expires_on)}`
                  : 'No expiry'}
              </Text>
            </View>
          ))
        )}

        <View style={pdfStyles.footerStrip} fixed>
          <Text style={pdfStyles.footerLeft}>
            {data.siteName.toUpperCase()} · EHO BUNDLE
          </Text>
          <Text
            style={pdfStyles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `PAGE ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.kvRow}>
      <Text style={pdfStyles.kvKey}>{label.toUpperCase()}</Text>
      <Text style={pdfStyles.kvVal}>{value}</Text>
    </View>
  );
}
