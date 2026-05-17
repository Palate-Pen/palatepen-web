import { StyleSheet } from '@react-pdf/renderer';

/**
 * Shared PDF stylesheet. Mirrors Palatable's v8 design system at print
 * scale — Cinzel-style display (Helvetica-Bold as the safe PDF
 * fallback), serif body (Times-Roman), gold accents tuned for ink.
 *
 * react-pdf doesn't load Google Fonts by default; using the built-in
 * Helvetica + Times-Roman keeps the bundle small and renders identically
 * across server environments.
 */
export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    color: '#1A1612',
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 14,
    marginBottom: 24,
    borderBottomWidth: 0.75,
    borderBottomColor: '#1A1612',
  },
  brandWord: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#1A1612',
  },
  brandDot: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#B8923C',
  },
  docMeta: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    letterSpacing: 1.5,
    color: '#7A6F5E',
  },
  title: {
    fontFamily: 'Times-Roman',
    fontSize: 26,
    color: '#1A1612',
    marginBottom: 6,
  },
  titleEm: {
    fontFamily: 'Times-Italic',
    color: '#B8923C',
  },
  subtitle: {
    fontFamily: 'Times-Italic',
    fontSize: 11,
    color: '#7A6F5E',
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 2.4,
    color: '#B8923C',
    marginBottom: 6,
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 16,
    color: '#1A1612',
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    color: '#1A1612',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  bodySoft: {
    fontFamily: 'Times-Italic',
    fontSize: 10,
    color: '#7A6F5E',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  metaLine: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#7A6F5E',
    marginBottom: 4,
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  // Table-ish
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A1612',
    opacity: 0.15,
    marginVertical: 6,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  kvKey: {
    width: 110,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 2,
    color: '#7A6F5E',
    paddingTop: 1.5,
  },
  kvVal: {
    flex: 1,
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    color: '#1A1612',
  },
  // CCP / list card
  card: {
    borderWidth: 0.6,
    borderColor: '#1A1612',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FCFAF4',
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#1A1612',
    marginBottom: 4,
  },
  // Footer / sign-off
  footerStrip: {
    position: 'absolute',
    left: 56,
    right: 56,
    bottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#1A1612',
  },
  footerLeft: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: '#7A6F5E',
  },
  footerRight: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: '#7A6F5E',
  },
  // Liability notice
  liability: {
    borderWidth: 0.75,
    borderColor: '#A14424',
    backgroundColor: '#FDF6F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  liabilityLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 2.4,
    color: '#A14424',
    marginBottom: 4,
  },
  liabilityBody: {
    fontFamily: 'Times-Roman',
    fontSize: 9,
    color: '#1A1612',
    lineHeight: 1.5,
  },
});

// Helper to compose styles
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function s(...styles: any[]) {
  return styles.filter(Boolean);
}
