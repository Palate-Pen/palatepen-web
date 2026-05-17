import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ALLERGENS, type AllergenState } from '@/lib/allergens';
import { mm, type LabelSize } from './label-sizes';

/**
 * Two label documents that share a layout engine:
 *
 *   PrepLabelDoc  — kitchen prep label (SFBB-aligned shelf-life record).
 *                   Item name · prep date · use-by · allergen short
 *                   codes · prepared by · storage hint.
 *
 *   PpdsLabelDoc  — Pre-Packed for Direct Sale (Natasha's Law / FIR
 *                   2014). Item name · full ingredient list in
 *                   descending weight order with allergens emphasised
 *                   in BOLD CAPS · storage · use-by · FBO.
 *
 * Both accept a LabelSize so the page sizes to the chef's printer or
 * paper. Sheet layouts repeat the same label N times across an A4 page.
 */

const styles = StyleSheet.create({
  // Single label (one page = one label)
  singlePage: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 5,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  // A4 sheet (grid of labels)
  sheetPage: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  // The label card itself (used in both layouts)
  labelCard: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 5,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#000000',
    overflow: 'hidden',
  },
  labelCardSheetBorder: {
    borderWidth: 0.3,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
  },
  // Prep label
  prepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  prepHeaderLeft: {
    flex: 1,
  },
  prepBrandRow: {
    flexDirection: 'row',
    fontSize: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#7A6F5E',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  // Day-dot circle (industry-standard colour-coded use-by indicator
  // used by DateCodeGenie / DayMark / National Checking — Mon=Blue,
  // Tue=Green, Wed=Red, Thu=Brown, Fri=Black, Sat=Orange, Sun=Yellow).
  prepDayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    borderWidth: 0.5,
    borderColor: '#000000',
  },
  prepDayDotLetter: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  prepName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    marginBottom: 3,
    lineHeight: 1.05,
  },
  prepUseByBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
    paddingBottom: 1.5,
    borderBottomWidth: 0.4,
    borderBottomColor: '#000000',
  },
  prepUseByLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    letterSpacing: 0.8,
    width: 42,
  },
  prepUseByVal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    flex: 1,
  },
  prepDateRow: {
    flexDirection: 'row',
    fontSize: 6.5,
    marginBottom: 1.5,
  },
  prepKey: {
    fontFamily: 'Helvetica-Bold',
    width: 38,
  },
  prepVal: {
    flex: 1,
  },
  prepAllergenStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    gap: 2,
  },
  prepAllergenChip: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    paddingHorizontal: 2,
    paddingVertical: 0.5,
    borderWidth: 0.4,
    borderColor: '#000000',
    backgroundColor: '#FFF5DA',
    color: '#8B6914',
    letterSpacing: 0.4,
  },
  prepAllergenChipMay: {
    backgroundColor: '#FFFFFF',
    color: '#7A6F5E',
  },
  prepNoneNote: {
    fontFamily: 'Helvetica',
    fontStyle: 'italic',
    fontSize: 6,
    color: '#7A6F5E',
    marginTop: 1,
  },
  // PPDS label
  ppdsHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 1.5,
    borderBottomWidth: 0.3,
    borderBottomColor: '#000000',
    marginBottom: 3,
  },
  ppdsBrand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 5,
    color: '#000000',
    letterSpacing: 0.8,
  },
  ppdsLegal: {
    fontFamily: 'Helvetica',
    fontSize: 4.5,
    color: '#7A6F5E',
    letterSpacing: 0.5,
  },
  ppdsName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    marginBottom: 2.5,
    lineHeight: 1.1,
  },
  ppdsIngredientsLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 5.5,
    letterSpacing: 0.6,
    color: '#000000',
    marginBottom: 1.5,
  },
  ppdsIngredientsBody: {
    fontSize: 6.5,
    lineHeight: 1.3,
    marginBottom: 3,
  },
  ppdsBold: {
    fontFamily: 'Helvetica-Bold',
  },
  ppdsKvRow: {
    flexDirection: 'row',
    fontSize: 6,
    marginBottom: 0.5,
  },
  ppdsKvKey: {
    fontFamily: 'Helvetica-Bold',
    width: 36,
  },
  ppdsKvVal: {
    flex: 1,
  },
});

// ===================================================================
// Common helpers
// ===================================================================

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

function shortDate(d: Date): string {
  return dateFmt.format(d);
}

/**
 * UK kitchen-industry day-dot colour code. Mirrors DateCodeGenie /
 * DayMark / National Checking standard — used to colour-code use-by
 * day at a glance.
 */
const DAY_DOT: Array<{ letter: string; colour: string; lightText: boolean }> = [
  // Sunday (JS getDay() = 0)
  { letter: 'S', colour: '#F2D11A', lightText: false },  // Yellow
  { letter: 'M', colour: '#1453A6', lightText: true },   // Blue
  { letter: 'T', colour: '#2E8B3B', lightText: true },   // Green
  { letter: 'W', colour: '#C82127', lightText: true },   // Red
  { letter: 'T', colour: '#7A4A1F', lightText: true },   // Brown
  { letter: 'F', colour: '#1A1612', lightText: true },   // Black
  { letter: 'S', colour: '#E07A1E', lightText: true },   // Orange
];

function dayDotFor(d: Date) {
  return DAY_DOT[d.getDay()];
}

/** Allergen short codes a prep label should carry. */
function allergenChips(state: AllergenState | null | undefined) {
  const contains = state?.contains ?? [];
  const may = state?.mayContain ?? [];
  return ALLERGENS.filter(
    (a) => contains.includes(a.key) || may.includes(a.key),
  ).map((a) => ({
    short: a.short,
    label: a.label,
    state: (contains.includes(a.key) ? 'contains' : 'may') as
      | 'contains'
      | 'may',
  }));
}

/** Repeats a single label card across an A4 sheet, sized + spaced
 *  according to the preset's perA4 columns/rows. */
function SheetGrid({
  size,
  count,
  renderCard,
}: {
  size: LabelSize;
  count: number;
  renderCard: () => React.ReactNode;
}) {
  const cellWidthPt = mm(size.widthMm);
  const cellHeightPt = mm(size.heightMm);
  const cards = Array.from({ length: count }).map((_, i) => (
    <View
      key={i}
      style={[
        styles.labelCard,
        styles.labelCardSheetBorder,
        { width: cellWidthPt, height: cellHeightPt },
      ]}
    >
      {renderCard()}
    </View>
  ));
  return <>{cards}</>;
}

// ===================================================================
// PrepLabelDoc
// ===================================================================
export type PrepLabelData = {
  siteName: string;
  recipeName: string;
  preparedAt: Date;
  shelfLifeDays: number;
  allergens: AllergenState | null;
  preparedBy: string;
  storageHint: string; // 'Chill below 5°C' / 'Freeze' / 'Ambient'
};

export function PrepLabelDoc({
  size,
  copies,
  data,
}: {
  size: LabelSize;
  copies: number;
  data: PrepLabelData;
}) {
  const useBy = new Date(
    data.preparedAt.getTime() + data.shelfLifeDays * 24 * 60 * 60 * 1000,
  );
  const chips = allergenChips(data.allergens);

  const dayDot = dayDotFor(useBy);

  const card = () => (
    <>
      <View style={styles.prepHeader}>
        <View style={styles.prepHeaderLeft}>
          <View style={styles.prepBrandRow}>
            <Text>PALATABLE · PREP</Text>
          </View>
          <Text style={styles.prepName}>{data.recipeName}</Text>
        </View>
        <View
          style={[
            styles.prepDayDot,
            { backgroundColor: dayDot.colour },
          ]}
        >
          <Text
            style={
              dayDot.lightText
                ? styles.prepDayDotLetter
                : [styles.prepDayDotLetter, { color: '#1A1612' }]
            }
          >
            {dayDot.letter}
          </Text>
        </View>
      </View>
      <View style={styles.prepUseByBox}>
        <Text style={styles.prepUseByLabel}>USE BY</Text>
        <Text style={styles.prepUseByVal}>{shortDate(useBy)}</Text>
      </View>
      <View style={styles.prepDateRow}>
        <Text style={styles.prepKey}>PREP</Text>
        <Text style={styles.prepVal}>{shortDate(data.preparedAt)}</Text>
      </View>
      <View style={styles.prepDateRow}>
        <Text style={styles.prepKey}>BY</Text>
        <Text style={styles.prepVal}>{data.preparedBy}</Text>
      </View>
      <View style={styles.prepDateRow}>
        <Text style={styles.prepKey}>STORE</Text>
        <Text style={styles.prepVal}>{data.storageHint}</Text>
      </View>
      {chips.length === 0 ? (
        <Text style={styles.prepNoneNote}>No allergens declared.</Text>
      ) : (
        <View style={styles.prepAllergenStrip}>
          {chips.map((c) => (
            <Text
              key={c.short}
              style={
                c.state === 'may'
                  ? [styles.prepAllergenChip, styles.prepAllergenChipMay]
                  : styles.prepAllergenChip
              }
            >
              {c.short}
              {c.state === 'may' ? '?' : ''}
            </Text>
          ))}
        </View>
      )}
    </>
  );

  return (
    <Document title={`${data.recipeName} · prep label`} author="Palatable">
      {size.layout === 'single'
        ? Array.from({ length: copies }).map((_, i) => (
            <Page
              key={i}
              size={[mm(size.widthMm), mm(size.heightMm)]}
              style={styles.singlePage}
            >
              {card()}
            </Page>
          ))
        : (
          <Page size="A4" style={styles.sheetPage}>
            <SheetGrid size={size} count={copies} renderCard={card} />
          </Page>
        )}
    </Document>
  );
}

// ===================================================================
// PpdsLabelDoc — Natasha's Law / FIR 2014 compliant
// ===================================================================
export type PpdsIngredientLine = {
  name: string;
  /** True if the ingredient (or its allergen list) contains a regulated
   *  allergen — name is rendered in BOLD CAPS for emphasis as required
   *  by FIR 2014. */
  isAllergen: boolean;
};

export type PpdsLabelData = {
  siteName: string;
  fboName: string; // legally responsible Food Business Operator + address
  recipeName: string;
  /** Ingredients in descending order by weight (FIR 2014 requirement). */
  ingredients: PpdsIngredientLine[];
  /** Optional summary of allergens (the 14) that the dish contains, for
   *  the customer-facing "contains:" line. */
  containsAllergens: string[];
  /** ISO date string for use-by — usually computed from prep + shelf life. */
  useByLabel: string;
  storageInstruction: string;
  /** Pack quantity / weight (e.g. "180g", "1 portion"). */
  quantityLabel: string;
};

export function PpdsLabelDoc({
  size,
  copies,
  data,
}: {
  size: LabelSize;
  copies: number;
  data: PpdsLabelData;
}) {
  const card = () => (
    <>
      <View style={styles.ppdsHeadingRow}>
        <Text style={styles.ppdsBrand}>
          {data.siteName.toUpperCase().slice(0, 32)}
        </Text>
        <Text style={styles.ppdsLegal}>PPDS · NATASHA&apos;S LAW</Text>
      </View>
      <Text style={styles.ppdsName}>{data.recipeName}</Text>
      <Text style={styles.ppdsIngredientsLabel}>INGREDIENTS</Text>
      <Text style={styles.ppdsIngredientsBody}>
        {data.ingredients.map((ing, i) => (
          <Text key={i}>
            <Text style={ing.isAllergen ? styles.ppdsBold : undefined}>
              {ing.isAllergen ? ing.name.toUpperCase() : ing.name}
            </Text>
            {i < data.ingredients.length - 1 ? ', ' : '.'}
          </Text>
        ))}
      </Text>
      {data.containsAllergens.length > 0 && (
        <Text style={[styles.ppdsKvRow, styles.ppdsBold]}>
          Contains: {data.containsAllergens.join(', ')}.
        </Text>
      )}
      {data.quantityLabel && (
        <View style={styles.ppdsKvRow}>
          <Text style={styles.ppdsKvKey}>QTY</Text>
          <Text style={styles.ppdsKvVal}>{data.quantityLabel}</Text>
        </View>
      )}
      {data.useByLabel && (
        <View style={styles.ppdsKvRow}>
          <Text style={styles.ppdsKvKey}>USE BY</Text>
          <Text style={[styles.ppdsKvVal, styles.ppdsBold]}>
            {data.useByLabel}
          </Text>
        </View>
      )}
      {data.storageInstruction && (
        <View style={styles.ppdsKvRow}>
          <Text style={styles.ppdsKvKey}>STORAGE</Text>
          <Text style={styles.ppdsKvVal}>{data.storageInstruction}</Text>
        </View>
      )}
      {data.fboName && (
        <View style={[styles.ppdsKvRow, { marginTop: 1.5 }]}>
          <Text style={styles.ppdsKvKey}>FBO</Text>
          <Text style={styles.ppdsKvVal}>{data.fboName}</Text>
        </View>
      )}
    </>
  );

  return (
    <Document title={`${data.recipeName} · PPDS label`} author="Palatable">
      {size.layout === 'single'
        ? Array.from({ length: copies }).map((_, i) => (
            <Page
              key={i}
              size={[mm(size.widthMm), mm(size.heightMm)]}
              style={styles.singlePage}
            >
              {card()}
            </Page>
          ))
        : (
          <Page size="A4" style={styles.sheetPage}>
            <SheetGrid size={size} count={copies} renderCard={card} />
          </Page>
        )}
    </Document>
  );
}
