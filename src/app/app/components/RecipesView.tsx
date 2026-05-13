'use client';
import { useState, useEffect } from 'react';
import { useApp, uid } from '@/context/AppContext';
import { useIsMobile } from '@/lib/useIsMobile';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useFeatureFlag } from '@/lib/usePlatformConfig';

const CATS = ['Starter','Main','Dessert','Sauce','Bread','Pastry','Stock','Snack','Other'];

// UK Food Information Regulations — 14 mandatory allergens
const ALLERGENS: { key: string; label: string; short: string }[] = [
  { key: 'gluten',     label: 'Gluten',     short: 'GL' },
  { key: 'crustaceans',label: 'Crustaceans',short: 'CR' },
  { key: 'eggs',       label: 'Eggs',       short: 'EG' },
  { key: 'fish',       label: 'Fish',       short: 'FI' },
  { key: 'peanuts',    label: 'Peanuts',    short: 'PE' },
  { key: 'soybeans',   label: 'Soybeans',   short: 'SO' },
  { key: 'milk',       label: 'Milk',       short: 'MI' },
  { key: 'nuts',       label: 'Nuts',       short: 'NU' },
  { key: 'celery',     label: 'Celery',     short: 'CE' },
  { key: 'mustard',    label: 'Mustard',    short: 'MU' },
  { key: 'sesame',     label: 'Sesame',     short: 'SE' },
  { key: 'sulphites',  label: 'Sulphites',  short: 'SU' },
  { key: 'lupin',      label: 'Lupin',      short: 'LU' },
  { key: 'molluscs',   label: 'Molluscs',   short: 'MO' },
];

// FIR sub-types — UK law requires naming the specific tree nut and cereal
const NUT_TYPES = ['Almond','Hazelnut','Walnut','Cashew','Pecan','Brazil nut','Pistachio','Macadamia'];
const GLUTEN_TYPES = ['Wheat','Rye','Barley','Oats','Spelt','Kamut'];


const NUTRITION_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'kcal',      label: 'Energy',         unit: 'kcal' },
  { key: 'kj',        label: 'Energy',         unit: 'kJ' },
  { key: 'fat',       label: 'Fat',            unit: 'g' },
  { key: 'saturates', label: 'of which saturates', unit: 'g' },
  { key: 'carbs',     label: 'Carbohydrate',   unit: 'g' },
  { key: 'sugars',    label: 'of which sugars', unit: 'g' },
  { key: 'protein',   label: 'Protein',        unit: 'g' },
  { key: 'salt',      label: 'Salt',           unit: 'g' },
  { key: 'fibre',     label: 'Fibre',          unit: 'g' },
];

// UK FOP traffic-light thresholds per 100g of finished food (2013 DH guidance).
// Returns 'low' (green), 'med' (amber), 'high' (red), or null if no rule.
type Light = 'low' | 'med' | 'high';
const FOP: Record<string, [number, number]> = {
  // [low/med boundary, med/high boundary]
  fat:       [3.0, 17.5],
  saturates: [1.5, 5.0],
  sugars:    [5.0, 22.5],
  salt:      [0.3, 1.5],
};
function trafficLight(key: string, valuePer100g: number): Light | null {
  const t = FOP[key];
  if (!t) return null;
  if (valuePer100g <= t[0]) return 'low';
  if (valuePer100g <= t[1]) return 'med';
  return 'high';
}
const LIGHT_LABEL: Record<Light, string> = { low: 'LOW', med: 'MED', high: 'HIGH' };
function lightColors(C: any, l: Light): { fg: string; bg: string; bd: string } {
  if (l === 'low')  return { fg: C.greenLight, bg: C.greenLight + '18', bd: C.greenLight + '40' };
  if (l === 'med')  return { fg: C.gold,       bg: C.gold + '18',       bd: C.gold + '40' };
  return                  { fg: C.red,        bg: C.red + '18',        bd: C.red + '40' };
}

// Convert a (qty, unit) pair into grams/ml so we can scale per-100 nutrition.
// Returns null if we can't make sense of the unit (e.g. 'ea').
function toGrams(qty: number, unit: string | undefined): number | null {
  const u = (unit || '').toLowerCase();
  if (u === 'g' || u === 'ml') return qty;
  if (u === 'kg' || u === 'l') return qty * 1000;
  return null; // 'ea', 'dozen', 'case', etc. — can't compute without weight
}

// Compute allergens + nutrition for a recipe from its linked costing's ingredients
// matched against the bank.
function computeFromBank(costing: any, bank: any[]) {
  const result = {
    contains: new Set<string>(),
    nutTypes: new Set<string>(),
    glutenTypes: new Set<string>(),
    nutrition: {} as Record<string, number>,
    matched: 0,
    unmatched: [] as string[],
    nutritionCoverage: 0, // grams of ingredients we could compute nutrition for
    nutritionTotal: 0,    // grams of ingredients in the recipe overall
  };
  if (!costing?.ingredients?.length) return result;
  for (const ing of costing.ingredients) {
    const name = (ing.name || '').toLowerCase().trim();
    const bankItem = bank.find((b: any) => (b.name || '').toLowerCase().trim() === name);
    if (!bankItem) {
      result.unmatched.push(ing.name || '(unnamed)');
      continue;
    }
    result.matched++;
    (bankItem.allergens?.contains || []).forEach((k: string) => result.contains.add(k));
    (bankItem.allergens?.nutTypes || []).forEach((k: string) => result.nutTypes.add(k));
    (bankItem.allergens?.glutenTypes || []).forEach((k: string) => result.glutenTypes.add(k));
    const grams = toGrams(parseFloat(ing.qty) || 0, ing.unit);
    if (grams !== null) result.nutritionTotal += grams;
    if (grams !== null && bankItem.nutrition) {
      const scale = grams / 100;
      let any = false;
      NUTRITION_FIELDS.forEach(f => {
        const v = parseFloat(bankItem.nutrition[f.key]);
        if (!isNaN(v)) {
          result.nutrition[f.key] = (result.nutrition[f.key] || 0) + v * scale;
          any = true;
        }
      });
      if (any) result.nutritionCoverage += grams;
    }
  }
  return result;
}

function gpColor(pct: number, target: number, C: any) {
  if (pct >= target) return C.greenLight;
  if (pct >= 65) return C.gold;
  return C.red;
}

export default function RecipesView() {
  const { state, actions } = useApp();
  const { user } = useAuth();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const isMobile = useIsMobile();
  const sym = (state.profile||{}).currencySymbol || '£';
  const gpTarget = (state.profile||{}).gpTarget || 72;
  const userOverrides = (state.profile as any)?.featureOverrides;
  const flagAiRecipeImport = useFeatureFlag('aiRecipeImport', userOverrides);
  const flagAiSpecSheet = useFeatureFlag('aiSpecSheet', userOverrides);

  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Main');
  const [newNotes, setNewNotes] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [importError, setImportError] = useState('');
  const [importedData, setImportedData] = useState<any>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string,boolean>>({});
  const [assigningCosting, setAssigningCosting] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
  // Recipe cost simulator: per-ingredient % adjusters mapped by ingredient id.
  // Stored as a Record because it resets every time the user opens the modal.
  const [showSimulator, setShowSimulator] = useState(false);
  const [simAdjusts, setSimAdjusts] = useState<Record<string, number>>({});
  const [showRecipePrint, setShowRecipePrint] = useState(false);
  const [showRecipeBook, setShowRecipeBook] = useState(false);
  // Spec-sheet scan modal
  const [showScanSpec, setShowScanSpec] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedData, setScannedData] = useState<any>(null);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  // Edit-mode buffer for the linked costing's ingredients — sourced from
  // state.gpHistory when edit mode opens, debounced-saved back as the user edits.
  const [editCostingIngs, setEditCostingIngs] = useState<any[]>([]);
  const [eciSuggestRow, setEciSuggestRow] = useState<string | null>(null);

  // Inline costing panel state
  const [showInlineCosting, setShowInlineCosting] = useState(false);
  const [ilcSell, setIlcSell] = useState('');
  const [ilcPortions, setIlcPortions] = useState('1');
  const [ilcIngs, setIlcIngs] = useState<any[]>([]);
  const [ilcSaving, setIlcSaving] = useState(false);
  const [ilcSuggestRow, setIlcSuggestRow] = useState<string | null>(null);
  const ILC_UNITS = ['kg', 'g', 'L', 'ml', 'each', 'bunch', 'tbsp'];

  function ilcCalcLine(qty: number, unit: string, price: number) {
    let line = qty * price;
    if (unit === 'g' || unit === 'ml') line = (qty / 1000) * price;
    return line;
  }
  function ilcSetField(id: string, field: 'name' | 'qty' | 'unit' | 'price', value: any) {
    setIlcIngs(prev => prev.map(row => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: value };
      const qty = parseFloat(next.qty) || 0;
      const price = parseFloat(next.price) || 0;
      next.line = ilcCalcLine(qty, next.unit, price);
      return next;
    }));
  }
  function ilcAddRow() {
    setIlcIngs(prev => [...prev, { id: Date.now().toString() + '-' + Math.random().toString(36).slice(2,6), name: '', qty: '', unit: 'g', price: '', line: 0 }]);
  }
  function ilcRemoveRow(id: string) {
    setIlcIngs(prev => prev.filter(r => r.id !== id));
  }
  function ilcAutofillPrice(id: string, name: string) {
    const m = state.ingredientsBank.find((b: any) => (b.name||'').toLowerCase() === (name||'').toLowerCase());
    if (m?.unitPrice) ilcSetField(id, 'price', String(m.unitPrice));
  }
  // Bank-name autocomplete: startsWith matches first, then contains. Capped at 6.
  function ilcBankMatches(query: string) {
    const q = (query || '').toLowerCase().trim();
    if (q.length < 1) return [];
    const bank = state.ingredientsBank || [];
    const starts: any[] = [];
    const contains: any[] = [];
    for (const b of bank) {
      const n = (b.name || '').toLowerCase();
      if (!n) continue;
      if (n === q) { starts.unshift(b); continue; } // exact match floats to top
      if (n.startsWith(q)) starts.push(b);
      else if (n.includes(q)) contains.push(b);
    }
    return [...starts, ...contains].slice(0, 6);
  }
  // Pick a bank entry into the row: fills name + unit + (any known price) in one go.
  function ilcPickBank(rowId: string, bank: any) {
    setIlcIngs(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const next: any = { ...row, name: bank.name };
      if (bank.unit) next.unit = bank.unit;
      if (bank.unitPrice != null) next.price = String(bank.unitPrice);
      const qty = parseFloat(next.qty) || 0;
      const price = parseFloat(next.price) || 0;
      next.line = ilcCalcLine(qty, next.unit, price);
      return next;
    }));
    setIlcSuggestRow(null);
  }
  // Duplicate within the current builder (case-insensitive). Excludes the row itself.
  function ilcIsDuplicateName(rowId: string, name: string) {
    const k = (name || '').toLowerCase().trim();
    if (!k) return false;
    return ilcIngs.some(r => r.id !== rowId && (r.name || '').toLowerCase().trim() === k);
  }

  // ── Edit-mode costing-ingredient helpers — mirror the ilc* set but bound
  //    to editCostingIngs (the buffer for the linked costing's ingredients).
  function eciSetField(id: string, field: 'name' | 'qty' | 'unit' | 'price', value: any) {
    setEditCostingIngs(prev => prev.map(row => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: value };
      const qty = parseFloat(next.qty) || 0;
      const price = parseFloat(next.price) || 0;
      next.line = ilcCalcLine(qty, next.unit, price);
      return next;
    }));
  }
  function eciAddRow() {
    setEditCostingIngs(prev => [...prev, { id: Date.now().toString() + '-' + Math.random().toString(36).slice(2,6), name: '', qty: '', unit: 'g', price: '', line: 0 }]);
  }
  function eciRemoveRow(id: string) {
    setEditCostingIngs(prev => prev.filter(r => r.id !== id));
  }
  function eciAutofillPrice(id: string, name: string) {
    const m = (state.ingredientsBank || []).find((b: any) => (b.name||'').toLowerCase() === (name||'').toLowerCase());
    if (m?.unitPrice) eciSetField(id, 'price', String(m.unitPrice));
  }
  function eciPickBank(rowId: string, bank: any) {
    setEditCostingIngs(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const next: any = { ...row, name: bank.name };
      if (bank.unit) next.unit = bank.unit;
      if (bank.unitPrice != null) next.price = String(bank.unitPrice);
      const qty = parseFloat(next.qty) || 0;
      const price = parseFloat(next.price) || 0;
      next.line = ilcCalcLine(qty, next.unit, price);
      return next;
    }));
    setEciSuggestRow(null);
  }
  function eciIsDuplicateName(rowId: string, name: string) {
    const k = (name || '').toLowerCase().trim();
    if (!k) return false;
    return editCostingIngs.some(r => r.id !== rowId && (r.name || '').toLowerCase().trim() === k);
  }
  function openInlineCosting() {
    if (!sel) return;
    const seed = (sel.imported?.ingredients || []).map((s: string, i: number) => ({
      id: Date.now().toString() + '-' + i,
      name: s, qty: '', unit: 'g', price: '', line: 0,
    }));
    if (seed.length === 0) seed.push({ id: Date.now().toString() + '-0', name: '', qty: '', unit: 'g', price: '', line: 0 });
    setIlcIngs(seed);
    setIlcSell('');
    const servings = parseInt((sel.imported?.servings || '').toString().replace(/[^0-9]/g, '')) || 1;
    setIlcPortions(String(servings));
    setShowInlineCosting(true);
  }
  function saveInlineCosting() {
    if (!sel) return;
    const sellNum = parseFloat(ilcSell) || 0;
    const portionsNum = parseInt(ilcPortions) || 1;
    const total = ilcIngs.reduce((a, b) => a + (parseFloat(b.line) || 0), 0);
    const costPer = total / portionsNum;
    const gpVal = sellNum - costPer;
    const pctVal = sellNum > 0 ? (gpVal / sellNum) * 100 : 0;
    const cleanIngs = ilcIngs
      .filter(r => (r.name||'').trim() !== '')
      .map(r => ({
        id: r.id,
        name: r.name.trim(),
        qty: parseFloat(r.qty) || 0,
        unit: r.unit,
        price: parseFloat(r.price) || 0,
        line: parseFloat(r.line) || 0,
      }));
    const newId = uid();
    setIlcSaving(true);
    actions.addGP({
      id: newId,
      name: sel.title,
      sell: sellNum,
      cost: costPer,
      gp: gpVal,
      pct: pctVal,
      currency: 'GBP',
      target: gpTarget,
      portions: portionsNum,
      ingredients: cleanIngs,
    });
    actions.updRecipe(sel.id, { linkedCostingId: newId });
    setSel((prev: any) => prev ? { ...prev, linkedCostingId: newId } : prev);
    // Bank-ensure the structured costing ingredients (clean name + unit)
    bankEnsureMany(cleanIngs.map(i => ({ name: i.name, unit: i.unit })));
    setShowInlineCosting(false);
    setIlcSaving(false);
  }

  // Ensure each named ingredient exists in the bank. Never overwrites an existing
  // entry's price — only inserts missing ones with unitPrice: null so the chef can
  // fill the price in later from an invoice. Dedup'd and single-dispatch so the
  // case-insensitive existence check stays correct (React state is async).
  function bankEnsureMany(items: { name: string; unit?: string }[]) {
    const bankNames = new Set((state.ingredientsBank || []).map((b: any) => (b.name || '').toLowerCase().trim()));
    const seen = new Set<string>();
    const fresh: any[] = [];
    for (const item of items) {
      const cleaned = (item.name || '').trim();
      if (!cleaned || cleaned.length < 2) continue;
      const key = cleaned.toLowerCase();
      if (bankNames.has(key) || seen.has(key)) continue;
      seen.add(key);
      fresh.push({
        name: cleaned,
        unit: item.unit || 'kg',
        category: 'Other',
        unitPrice: null,
        allergens: { contains: [], nutTypes: [], glutenTypes: [] },
        nutrition: {},
      });
    }
    if (fresh.length > 0) actions.upsertBank(fresh);
  }

  const filtered = state.recipes.filter((r: any) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.category||'').toLowerCase().includes(search.toLowerCase())
  );

  function getLinkedCosting(recipe: any) {
    if (!recipe) return null;
    // First check for explicit link
    if (recipe.linkedCostingId) {
      return state.gpHistory.find((h: any) => h.id === recipe.linkedCostingId) || null;
    }
    // Fall back to name match
    return state.gpHistory.find((h: any) =>
      h.name?.toLowerCase().trim() === recipe.title?.toLowerCase().trim()
    ) || null;
  }

  function assignCosting(costingId: string) {
    actions.updRecipe(sel.id, { linkedCostingId: costingId });
    setSel({ ...sel, linkedCostingId: costingId });
    setAssigningCosting(false);
  }

  function removeCosting() {
    actions.updRecipe(sel.id, { linkedCostingId: null });
    setSel({ ...sel, linkedCostingId: null });
  }

  function openEdit() {
    setEditTitle(sel.title || '');
    setEditCat(sel.category || 'Main');
    setEditNotes(sel.notes || '');
    setEditMode(true);
  }

  useEffect(() => {
    if (!editMode || !sel || !editTitle.trim()) return;
    const t = setTimeout(() => {
      const updates: any = { title: editTitle.trim(), category: editCat, notes: editNotes };
      actions.updRecipe(sel.id, updates);
      setSel((prev:any) => prev ? { ...prev, ...updates } : prev);
    }, 500);
    return () => clearTimeout(t);
  }, [editMode, editTitle, editCat, editNotes]);

  // Seed the edit-mode costing-ingredient buffer when edit mode opens or the
  // linked costing changes. A deep clone keeps in-progress edits from mutating
  // the saved gpHistory record directly.
  useEffect(() => {
    if (!editMode) { setEditCostingIngs([]); return; }
    const lc = getLinkedCosting(sel);
    setEditCostingIngs(lc?.ingredients ? JSON.parse(JSON.stringify(lc.ingredients)) : []);
  }, [editMode, sel?.linkedCostingId]);

  // Debounced save back to gpHistory — recomputes cost / GP / pct from the
  // edited ingredients and the costing's existing sell/portions. Also
  // bank-ensures any new ingredient names so they show up in the Bank tab.
  useEffect(() => {
    if (!editMode) return;
    const lc = getLinkedCosting(sel);
    if (!lc) return;
    const t = setTimeout(() => {
      const ings = editCostingIngs.map(r => ({
        id: r.id,
        name: (r.name || '').trim(),
        qty: parseFloat(r.qty) || 0,
        unit: r.unit,
        price: parseFloat(r.price) || 0,
        line: parseFloat(r.line) || 0,
        ...(r.sourceRecipeId ? { sourceRecipeId: r.sourceRecipeId } : {}),
      })).filter(i => i.name);
      const totalCost = ings.reduce((a, b) => a + (b.line || 0), 0);
      const portions = parseInt(lc.portions) || 1;
      const cost = totalCost / portions;
      const sell = parseFloat(lc.sell) || 0;
      const gp = sell - cost;
      const pct = sell > 0 ? (gp / sell) * 100 : 0;
      actions.updGP(lc.id, { ingredients: ings, cost, gp, pct, savedAt: Date.now() });
      bankEnsureMany(ings.map(i => ({ name: i.name, unit: i.unit })));
    }, 500);
    return () => clearTimeout(t);
  }, [editCostingIngs, editMode]);

  // Keep `sel` in lockstep with state.recipes — any updRecipe() dispatch reflects instantly
  // in the recipe-detail UI without needing to re-open the recipe.
  useEffect(() => {
    if (!sel) return;
    const fresh = state.recipes.find((r: any) => r.id === sel.id);
    if (fresh && fresh !== sel) setSel(fresh);
  }, [state.recipes]);

  function resetAddForm() {
    setShowAdd(false);
    setNewTitle(''); setNewCat('Main'); setNewNotes('');
    setImportUrl(''); setImportError(''); setImportedData(null); setImporting(false);
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    setNewPhotoFile(null); setNewPhotoPreview('');
  }

  function pickNewPhoto(file: File | null) {
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    if (!file) { setNewPhotoFile(null); setNewPhotoPreview(''); return; }
    setNewPhotoFile(file);
    setNewPhotoPreview(URL.createObjectURL(file));
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const result = r.result as string;
        // strip "data:<mime>;base64,"
        const i = result.indexOf(',');
        resolve(i >= 0 ? result.slice(i + 1) : result);
      };
      r.onerror = () => reject(new Error('Could not read file'));
      r.readAsDataURL(file);
    });
  }
  function fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('Could not read file'));
      r.readAsText(file);
    });
  }

  async function importRecipe(opts?: { file?: File }) {
    const url = importUrl.trim();
    const file = opts?.file;
    if (!url && !file) return;
    setImporting(true);
    setImportError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userToken = session?.access_token || '';

      let body: any = { userToken };
      if (file) {
        const isText = file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name);
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        const isImage = file.type.startsWith('image/');
        if (isText) {
          body.text = await fileToText(file);
        } else if (isPdf || isImage) {
          body.base64 = await fileToBase64(file);
          body.mediaType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');
        } else {
          setImportError('Unsupported file type — use PDF, image (JPG/PNG/WebP) or text');
          setImporting(false);
          return;
        }
      } else {
        body.url = url;
      }

      const res = await fetch('/api/palatable/import-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        if (json.debug) console.error('[import-recipe] debug:', json.debug);
        // Only append a snippet if it's a string — apiError is an object, the API message is already in json.error
        const snippet = typeof json.debug?.rawSnippet === 'string' ? json.debug.rawSnippet
                      : typeof json.debug?.jsonStr === 'string' ? json.debug.jsonStr
                      : null;
        setImportError(json.error + (snippet ? ` — Claude said: ${snippet.slice(0, 200)}` : '') || `Import failed (HTTP ${res.status})`);
      } else {
        setImportedData(json);
        if (json.title) setNewTitle(json.title);
        if (json.category && CATS.includes(json.category)) setNewCat(json.category);
        if (json.chefNotes) setNewNotes(json.chefNotes);
      }
    } catch (e: any) {
      setImportError(e?.message || 'Network error');
    }
    setImporting(false);
  }

  // ── SPEC SHEET SCAN ──────────────────────────────────────
  // Sends a PDF/image to /api/palatable/scan-spec-sheet and stages the
  // returned structured data for user review before commit.
  async function scanSpecSheet(file: File) {
    setScanError('');
    setScannedData(null);
    setScanning(true);
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isImage = file.type.startsWith('image/');
      if (!isPdf && !isImage) {
        setScanError('Unsupported file type — use PDF or image (JPG/PNG/WebP)');
        setScanning(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const userToken = session?.access_token || '';
      const base64 = await fileToBase64(file);
      const mediaType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');
      const res = await fetch('/api/palatable/scan-spec-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType, userToken }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        if (json.debug) console.error('[scan-spec-sheet] debug:', json.debug);
        const snippet = typeof json.debug?.rawSnippet === 'string' ? json.debug.rawSnippet : null;
        setScanError(json.error + (snippet ? ` — Claude said: ${snippet.slice(0, 200)}` : '') || `Scan failed (HTTP ${res.status})`);
      } else {
        setScannedData(json);
      }
    } catch (e: any) {
      setScanError(e?.message || 'Network error');
    }
    setScanning(false);
  }

  // Convert a scanned spec sheet into a recipe + costing pair and dispatch.
  // Computes cost/GP/pct from the parsed ingredient lines (with g→kg, ml→L
  // conversion to match the inline costing builder's convention).
  function commitScannedSpec() {
    if (!scannedData) return;
    const data = scannedData;
    const recipeId = uid();
    const costingId = uid();
    const rawIngs = Array.isArray(data.ingredients) ? data.ingredients : [];
    const cleanIngs = rawIngs.map((i: any, idx: number) => {
      const qty = parseFloat(i.qty) || 0;
      const price = parseFloat(i.price) || 0;
      const unit = (i.unit || 'g').toString();
      let line = qty * price;
      if (unit === 'g' || unit === 'ml') line = (qty / 1000) * price;
      return {
        id: `${Date.now()}-${idx}`,
        name: (i.name || '').toString().trim() || 'Ingredient',
        qty, unit, price,
        line,
      };
    });
    const portions = parseInt(data.portions) || 1;
    const totalCost = cleanIngs.reduce((a: number, b: any) => a + (b.line || 0), 0);
    const cost = totalCost / portions;
    const sell = parseFloat(data.sellPrice) || 0;
    const gp = sell - cost;
    const pct = sell > 0 ? (gp / sell) * 100 : 0;
    actions.addGP({
      id: costingId,
      name: (data.title || 'Untitled dish').toString(),
      sell, cost, gp, pct,
      target: parseFloat(data.targetGp) || gpTarget,
      portions,
      currency: 'GBP',
      ingredients: cleanIngs,
    });
    const recipe: any = {
      id: recipeId,
      title: (data.title || 'Untitled dish').toString(),
      category: CATS.includes(data.category) ? data.category : 'Main',
      notes: (data.chefNotes || '').toString(),
      linkedCostingId: costingId,
    };
    const ingStrings = cleanIngs.map((i: any) => `${i.qty || ''}${i.unit || ''} ${i.name}`.trim());
    const methodArr = Array.isArray(data.method) ? data.method.map((m: any) => String(m)) : [];
    if (ingStrings.length || methodArr.length || data.servings || data.prepTime || data.cookTime || data.description) {
      recipe.imported = {
        description: (data.description || '').toString(),
        servings: data.portions ? String(data.portions) : '',
        prepTime: (data.prepTime || '').toString(),
        cookTime: (data.cookTime || '').toString(),
        ingredients: ingStrings,
        method: methodArr,
      };
    }
    if (data.allergens && typeof data.allergens === 'object') {
      recipe.allergens = {
        contains: Array.isArray(data.allergens.contains) ? data.allergens.contains : [],
        mayContain: Array.isArray(data.allergens.mayContain) ? data.allergens.mayContain : [],
        nutTypes: Array.isArray(data.allergens.nutTypes) ? data.allergens.nutTypes : [],
        glutenTypes: Array.isArray(data.allergens.glutenTypes) ? data.allergens.glutenTypes : [],
      };
    }
    actions.addRecipe(recipe);
    bankEnsureMany(cleanIngs.map((i: any) => ({ name: i.name, unit: i.unit })));
    setShowScanSpec(false);
    setScannedData(null);
    setScanError('');
  }

  // ── PHOTO UPLOAD ──────────────────────────────────────────
  // Resize browser-side to keep uploaded files small (~200-300KB)
  async function resizePhoto(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = 1600;
        const ratio = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not encode image')), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  async function uploadPhoto(file: File) {
    if (!sel || !user?.id) return;
    setPhotoError('');
    setPhotoUploading(true);
    try {
      const blob = await resizePhoto(file);
      const ts = Date.now();
      const path = `${user.id}/${sel.id}-${ts}.jpg`;
      const { error: upErr } = await supabase.storage.from('recipe-photos').upload(path, blob, {
        contentType: 'image/jpeg', upsert: true, cacheControl: '3600',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('recipe-photos').getPublicUrl(path);
      const newUrl = pub.publicUrl;
      // If there was an old photo at a different path, attempt to delete it (best-effort)
      if (sel.photoPath && sel.photoPath !== path) {
        await supabase.storage.from('recipe-photos').remove([sel.photoPath]).catch(() => {});
      }
      actions.updRecipe(sel.id, { photoUrl: newUrl, photoPath: path });
    } catch (e: any) {
      setPhotoError(e?.message || 'Upload failed');
    }
    setPhotoUploading(false);
  }

  async function removePhoto() {
    if (!sel) return;
    if (sel.photoPath) {
      await supabase.storage.from('recipe-photos').remove([sel.photoPath]).catch(() => {});
    }
    actions.updRecipe(sel.id, { photoUrl: null, photoPath: null });
  }

  async function addRecipe() {
    if (!newTitle.trim()) return;
    // Pre-generate id so we can upload the photo to a known path while the
    // recipe row is being saved in parallel.
    const newId = uid();
    const recipe: any = { id: newId, title: newTitle.trim(), category: newCat, notes: newNotes };
    if (importedData) {
      recipe.url = importUrl.trim();
      recipe.imported = {
        description: importedData.description || '',
        servings: importedData.servings || '',
        prepTime: importedData.prepTime || '',
        cookTime: importedData.cookTime || '',
        ingredients: importedData.ingredients || [],
        method: importedData.method || [],
      };
    }
    actions.addRecipe(recipe);

    // Capture the photo file before the form is reset, then upload + patch.
    const photoFile = newPhotoFile;
    resetAddForm();
    if (photoFile && user?.id) {
      try {
        const blob = await resizePhoto(photoFile);
        const ts = Date.now();
        const path = `${user.id}/${newId}-${ts}.jpg`;
        const { error: upErr } = await supabase.storage.from('recipe-photos').upload(path, blob, {
          contentType: 'image/jpeg', upsert: true, cacheControl: '3600',
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('recipe-photos').getPublicUrl(path);
        actions.updRecipe(newId, { photoUrl: pub.publicUrl, photoPath: path });
      } catch (e: any) {
        console.error('[recipe photo upload]', e?.message);
      }
    }
  }

  const inp: any = { width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '9px 12px', outline: 'none', fontFamily: 'system-ui,sans-serif', boxSizing: 'border-box' };

  // Renders the printable body of a single recipe — used by both the single-recipe
  // Print modal and each page of the Recipe Book. Always light-themed (paper).
  // Ingredient source order: linked costing (priced, structured) → imported strings.
  function recipePrintBody(r: any) {
    const linked = getLinkedCosting(r);
    const computed = computeFromBank(linked, state.ingredientsBank || []);
    const portionsLinked = parseFloat(linked?.portions);
    const portionsImported = parseInt((r.imported?.servings || '').toString().replace(/[^0-9]/g, ''));
    const portions = !isNaN(portionsLinked) && portionsLinked > 0 ? portionsLinked
                   : !isNaN(portionsImported) && portionsImported > 0 ? portionsImported : null;
    const containsArr = Array.from(new Set<string>([
      ...Array.from(computed.contains),
      ...(r.allergens?.contains || []),
    ]));
    const mayContain = r.allergens?.mayContain || [];
    const nutTypesArr = Array.from(new Set<string>([
      ...Array.from(computed.nutTypes),
      ...(r.allergens?.nutTypes || []),
    ]));
    const glutenTypesArr = Array.from(new Set<string>([
      ...Array.from(computed.glutenTypes),
      ...(r.allergens?.glutenTypes || []),
    ]));
    const hasNutrition = NUTRITION_FIELDS.some(f => computed.nutrition[f.key] != null);
    const dishGrams = computed.nutritionCoverage;
    const printPortions = portions || 1;
    // Light-theme FOP swatches for print (paper-readable contrast)
    const fopCss = (l: Light | null): { fg: string; bg: string; bd: string } => {
      if (!l) return { fg: '#222', bg: 'transparent', bd: '#DDD' };
      if (l === 'low')  return { fg: '#1A6B2A', bg: '#E8F5EC', bd: '#1A6B2A' };
      if (l === 'med')  return { fg: '#A06800', bg: '#FFF4E0', bd: '#A06800' };
      return                   { fg: '#A00',     bg: '#FEE',     bd: '#A00' };
    };
    const meta = [
      r.category,
      portions ? portions + (portions === 1 ? ' portion' : ' portions') : null,
      r.imported?.prepTime ? 'Prep ' + r.imported.prepTime : null,
      r.imported?.cookTime ? 'Cook ' + r.imported.cookTime : null,
    ].filter(Boolean).join(' · ');
    return (
      <>
        {r.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.photoUrl} alt={r.title || 'Recipe'} style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '3px', marginBottom: '14px' }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #DDD', paddingBottom: '14px', marginBottom: '18px', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '30px', color: '#111', marginBottom: '6px' }}>{r.title || 'Untitled recipe'}</h1>
            {meta && <p style={{ fontSize: '12px', color: '#555' }}>{meta}</p>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {/* Palatable wordmark — primary, full size on top */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: '#111', fontSize: '20px' }}>P</span>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8960A', marginBottom: '7px' }}></div>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: '#111', fontSize: '20px', letterSpacing: '4px' }}>ALATABLE</span>
            </div>
            {/* User's business logo / name — sits below the platform brand */}
            {state.profile?.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.profile.logoUrl} alt={state.profile.businessName || 'Logo'} style={{ height: '36px', maxWidth: '140px', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginTop: '6px' }} />
                {state.profile?.businessName?.trim() && (
                  <p style={{ fontSize: '10px', color: '#555', marginTop: '2px', fontWeight: 600 }}>{state.profile.businessName.trim()}</p>
                )}
              </>
            ) : state.profile?.businessName?.trim() ? (
              <>
                <p style={{ fontSize: '12px', color: '#333', marginTop: '4px', fontWeight: 600, letterSpacing: '0.3px' }}>{state.profile.businessName.trim()}</p>
                {state.profile?.location && <p style={{ fontSize: '10px', color: '#888', marginTop: '1px' }}>{state.profile.location}</p>}
              </>
            ) : null}
          </div>
        </div>
        {r.imported?.description && (
          <p style={{ fontSize: '13px', color: '#333', fontStyle: 'italic', marginBottom: '16px', lineHeight: 1.6 }}>{r.imported.description}</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', marginBottom: '20px' }}>
          <section>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Ingredients</h2>
            {/* Linked costing wins when it exists — the imported-strings fallback
                only renders when the recipe has no costing attached. */}
            {linked ? (
              (linked.ingredients || []).length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {linked.ingredients.map((ing: any, i: number) => (
                    <li key={i} style={{ fontSize: '13px', color: '#222', padding: '4px 0', borderBottom: '0.5px dotted #DDD' }}>
                      <strong style={{ color: '#000' }}>{ing.qty}{ing.unit}</strong> {ing.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No ingredients in linked costing yet</p>
              )
            ) : r.imported?.ingredients?.length > 0 ? (
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {r.imported.ingredients.map((ing: string, i: number) => (
                  <li key={i} style={{ fontSize: '13px', color: '#222', padding: '3px 0' }}>{ing}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No ingredients</p>
            )}
          </section>
          <section>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Method</h2>
            {r.imported?.method?.length > 0 ? (
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                {r.imported.method.map((step: string, i: number) => (
                  <li key={i} style={{ fontSize: '13px', color: '#222', padding: '4px 0', lineHeight: 1.6 }}>{step}</li>
                ))}
              </ol>
            ) : r.notes?.trim() ? (
              <p style={{ fontSize: '13px', color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.notes}</p>
            ) : (
              <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No method recorded</p>
            )}
          </section>
        </div>
        {(containsArr.length > 0 || mayContain.length > 0) && (
          <section style={{ borderTop: '1px solid #DDD', paddingTop: '14px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px' }}>Allergens</h2>
            {containsArr.length > 0 && (
              <p style={{ fontSize: '12px', color: '#222', marginBottom: '4px' }}>
                <strong style={{ color: '#C00' }}>Contains:</strong>{' '}
                {containsArr.map(k => ALLERGENS.find(a => a.key === k)?.label).filter(Boolean).join(', ')}
              </p>
            )}
            {nutTypesArr.length > 0 && (
              <p style={{ fontSize: '12px', color: '#222', marginBottom: '4px', paddingLeft: '12px' }}>
                <strong style={{ color: '#C00' }}>Tree nuts:</strong>{' '}
                {nutTypesArr.join(', ')}
              </p>
            )}
            {glutenTypesArr.length > 0 && (
              <p style={{ fontSize: '12px', color: '#222', marginBottom: '4px', paddingLeft: '12px' }}>
                <strong style={{ color: '#C00' }}>Cereals:</strong>{' '}
                {glutenTypesArr.join(', ')}
              </p>
            )}
            {mayContain.length > 0 && (
              <p style={{ fontSize: '12px', color: '#222' }}>
                <strong style={{ color: '#A77' }}>May contain:</strong>{' '}
                {mayContain.map((k: string) => ALLERGENS.find(a => a.key === k)?.label).filter(Boolean).join(', ')}
              </p>
            )}
          </section>
        )}

        {/* Costing — only shown when a costing is linked, since cost data lives there.
            Same currency symbol as the rest of the app (state.profile.currencySymbol). */}
        {linked && (
          <section style={{ borderTop: '1px solid #DDD', paddingTop: '14px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Costing</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F4F4F2', color: '#555' }}>
                  <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600 }}>Sell</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}>Cost / cover</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}>GP £</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}>GP %</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}>Target</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '0.5px solid #EEE' }}>
                  <td style={{ padding: '6px 8px', color: '#111', fontWeight: 600 }}>{sym}{(parseFloat(linked.sell) || 0).toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#222' }}>{sym}{(parseFloat(linked.cost) || 0).toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#222' }}>{sym}{(parseFloat(linked.gp) || 0).toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: (linked.pct || 0) >= (linked.target || gpTarget) ? '#1A6B2A' : '#A00', fontWeight: 600 }}>{(parseFloat(linked.pct) || 0).toFixed(1)}%</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#555' }}>{(linked.target || gpTarget)}%</td>
                </tr>
              </tbody>
            </table>
            {(linked.ingredients || []).length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '8px' }}>
                <thead>
                  <tr style={{ color: '#888' }}>
                    <th style={{ textAlign: 'left', padding: '3px 8px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Ingredient</th>
                    <th style={{ textAlign: 'right', padding: '3px 8px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '3px 8px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{sym}/unit</th>
                    <th style={{ textAlign: 'right', padding: '3px 8px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {linked.ingredients.map((ing: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '0.5px dotted #DDD' }}>
                      <td style={{ padding: '3px 8px', color: '#222' }}>{ing.name}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#555' }}>{ing.qty}{ing.unit}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#555' }}>{sym}{(parseFloat(ing.price) || 0).toFixed(2)}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#111' }}>{sym}{(parseFloat(ing.line) || 0).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Nutrition — only shown when at least one Bank-matched ingredient supplies
            per-100g nutrition data. Per-portion + per-100g + UK FOP traffic lights. */}
        {hasNutrition && (
          <section style={{ borderTop: '1px solid #DDD', paddingTop: '14px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>
              Nutrition <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: '#888' }}>(per portion · {printPortions} portion{printPortions === 1 ? '' : 's'} · FOP per 100g)</span>
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F4F4F2', color: '#555' }}>
                  <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600 }}>Nutrient</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}>Per portion</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}>Per 100g</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}>FOP</th>
                </tr>
              </thead>
              <tbody>
                {NUTRITION_FIELDS.map(f => {
                  const total = computed.nutrition[f.key];
                  if (total == null) return null;
                  const perPortion = total / printPortions;
                  const per100 = dishGrams > 0 ? (total * 100) / dishGrams : null;
                  const light = per100 != null ? trafficLight(f.key, per100) : null;
                  const c = fopCss(light);
                  const decimals = f.unit === 'g' ? 1 : 0;
                  return (
                    <tr key={f.key} style={{ borderBottom: '0.5px solid #EEE' }}>
                      <td style={{ padding: '5px 8px', color: '#222' }}>{f.label}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#222', fontWeight: 600 }}>{perPortion.toFixed(decimals)}{f.unit}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#555' }}>{per100 != null ? per100.toFixed(decimals) + f.unit : '—'}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        {light ? (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: c.fg, background: c.bg, border: '1px solid ' + c.bd, padding: '1px 6px', borderRadius: '2px' }}>{LIGHT_LABEL[light]}</span>
                        ) : <span style={{ color: '#AAA' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {computed.nutritionTotal > 0 && computed.nutritionCoverage < computed.nutritionTotal && (
              <p style={{ fontSize: '10px', color: '#A06800', marginTop: '6px' }}>
                ⚠ Computed from {Math.round((computed.nutritionCoverage / computed.nutritionTotal) * 100)}% of recipe weight — add nutrition data to remaining Bank ingredients for full accuracy.
              </p>
            )}
          </section>
        )}

        {/* Chef's notes only shown as a separate section when a method already exists
            (otherwise notes have been used as the method fallback above). */}
        {r.notes?.trim() && (r.imported?.method?.length || 0) > 0 && (
          <section style={{ borderTop: '1px solid #DDD', paddingTop: '14px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px' }}>Chef&apos;s notes</h2>
            <p style={{ fontSize: '12px', color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.notes}</p>
          </section>
        )}
      </>
    );
  }

  // ── RECIPE DETAIL ──────────────────────────────────────────
  if (sel) {
    const linkedCosting = getLinkedCosting(sel);

    return (
      <div style={{ padding: isMobile ? '20px 16px' : '32px', maxWidth: '920px', fontFamily: 'system-ui,sans-serif', color: C.text }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={() => { setSel(null); setEditMode(false); setConfirmUnlock(false); setShowRecipePrint(false); }} style={{ fontSize: '13px', color: C.gold, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Recipe Library
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {sel.locked && !confirmUnlock && (
              <span title="Locked — content cannot be edited" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '14', border: '1px solid ' + C.gold + '50', padding: '5px 10px', borderRadius: '2px' }}>
                🔒 Locked
              </span>
            )}
            {!sel.locked ? (
              <button onClick={() => actions.updRecipe(sel.id, { locked: true })}
                title="Lock to freeze this recipe — prevents accidental edits"
                style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                🔒 Lock
              </button>
            ) : confirmUnlock ? (
              <>
                <span style={{ fontSize: '11px', color: C.red, alignSelf: 'center' }}>Unlock to allow edits?</span>
                <button onClick={() => { actions.updRecipe(sel.id, { locked: false }); setConfirmUnlock(false); }}
                  style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#fff', background: C.red, border: 'none', padding: '8px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                  Yes, unlock
                </button>
                <button onClick={() => setConfirmUnlock(false)}
                  style={{ fontSize: '11px', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmUnlock(true)}
                style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                🔓 Unlock
              </button>
            )}
            <button onClick={() => setShowRecipePrint(true)}
              title="Print this recipe (A4)"
              style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 12px', cursor: 'pointer', borderRadius: '2px' }}>
              🖨 Print
            </button>
            {editMode ? (
              <>
                <p style={{ fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, alignSelf: 'center' }}>Auto-saves</p>
                <button onClick={() => setEditMode(false)} style={{ fontSize: '11px', fontWeight: 700, color: C.bg, background: C.gold, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>Done</button>
              </>
            ) : (
              <button onClick={openEdit} disabled={!!sel.locked}
                title={sel.locked ? 'Recipe is locked — unlock to edit' : ''}
                style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: sel.locked ? C.faint : C.gold, background: sel.locked ? 'transparent' : C.gold + '12', border: '1px solid ' + (sel.locked ? C.border : C.gold + '30'), padding: '8px 16px', cursor: sel.locked ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: sel.locked ? 0.5 : 1 }}>
                Edit Recipe
              </button>
            )}
          </div>
        </div>

        {/* Photo */}
        <div style={{ marginBottom: '20px' }}>
          {sel.photoUrl ? (
            <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid ' + C.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sel.photoUrl} alt={sel.title || 'Recipe'} style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }} />
              {!sel.locked && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.text, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '2px', cursor: photoUploading ? 'wait' : 'pointer' }}>
                    {photoUploading ? 'Uploading…' : 'Replace'}
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} style={{ display: 'none' }} disabled={photoUploading} />
                  </label>
                  <button onClick={removePhoto} disabled={photoUploading}
                    style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.text, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', cursor: 'pointer', borderRadius: '2px' }}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : !sel.locked ? (
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '32px 20px', background: C.surface2, border: '1px dashed ' + C.border, borderRadius: '4px', cursor: photoUploading ? 'wait' : 'pointer' }}>
              <span style={{ fontSize: '13px', color: C.dim }}>{photoUploading ? 'Uploading…' : '📷 Add a photo'}</span>
              <span style={{ fontSize: '11px', color: C.faint }}>JPEG or PNG, auto-resized to 1600px wide</span>
              <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} style={{ display: 'none' }} disabled={photoUploading} />
            </label>
          ) : null}
          {photoError && <p style={{ fontSize: '12px', color: C.red, marginTop: '6px' }}>⚠ {photoError}</p>}
        </div>

        {/* Title */}
        {editMode ? (
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
            style={{ ...inp, background: 'transparent', fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', border: 'none', borderBottom: '1px solid ' + C.border, paddingBottom: '12px', marginBottom: '20px' }} />
        ) : (
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text, borderBottom: '1px solid ' + C.border, paddingBottom: '12px', marginBottom: '20px' }}>{sel.title}</h1>
        )}

        {/* Category */}
        {editMode ? (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '8px' }}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATS.map(c => (
                <button key={c} onClick={() => setEditCat(c)} style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid ' + (editCat === c ? C.gold : C.border), color: editCat === c ? C.gold : C.dim, background: editCat === c ? C.gold + '10' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>{c}</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {[sel.category, sel.imported?.servings ? 'Serves ' + sel.imported.servings : null, sel.imported?.prepTime ? 'Prep: ' + sel.imported.prepTime : null].filter(Boolean).map((t: string) => (
              <span key={t} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', padding: '4px 10px', borderRadius: '2px' }}>{t}</span>
            ))}
          </div>
        )}

        {/* LINKED NOTES */}
        {!editMode && (() => {
          const linkedNotes = (sel.linkedNoteIds||[]).map((id: string) => state.notes.find((n: any) => n.id === id)).filter(Boolean);
          if (!linkedNotes.length) return null;
          return (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>Linked Notes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {linkedNotes.map((note: any) => (
                  <div key={note.id} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', overflow: 'hidden' }}>
                    <button onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !prev[note.id] }))}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: '14px', color: C.text }}>{note.title || 'Untitled'}</span>
                      <span style={{ fontSize: '16px', color: C.faint }}>{expandedNotes[note.id] ? '−' : '+'}</span>
                    </button>
                    {expandedNotes[note.id] && (
                      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid ' + C.border }}>
                        <p style={{ fontSize: '13px', color: C.dim, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{note.content || 'No content yet.'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* COSTING PANEL — visible in both view and edit modes. In edit mode the
            ingredients table becomes editable (rows below) and saves debounce
            into gpHistory via the editCostingIngs buffer. */}
        {(
          <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', marginBottom: '28px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>Costing</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {linkedCosting && <p style={{ fontSize: '11px', color: C.faint }}>Last updated {new Date(linkedCosting.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                {linkedCosting && (
                  <button onClick={() => { setSimAdjusts({}); setShowSimulator(true); }}
                    title="Simulate ingredient price changes and see new GP"
                    style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '30', padding: '4px 10px', cursor: 'pointer', borderRadius: '2px' }}>
                    🧪 Simulator
                  </button>
                )}
                {linkedCosting && !sel.locked ? (
                  <button onClick={removeCosting} style={{ fontSize: '10px', color: C.faint, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove link</button>
                ) : null}
                <button onClick={() => setAssigningCosting(v => !v)} disabled={!!sel.locked}
                  title={sel.locked ? 'Recipe is locked' : ''}
                  style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: sel.locked ? C.faint : C.gold, background: sel.locked ? 'transparent' : C.gold + '12', border: '1px solid ' + (sel.locked ? C.border : C.gold + '30'), padding: '4px 10px', cursor: sel.locked ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: sel.locked ? 0.5 : 1 }}>
                  {assigningCosting ? 'Cancel' : linkedCosting ? 'Change' : '+ Assign Costing'}
                </button>
              </div>
            </div>

            {/* Costing select */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + C.border, background: C.surface2, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '11px', color: C.faint, whiteSpace: 'nowrap', flexShrink: 0 }}>Linked costing:</label>
              <select
                value={sel.linkedCostingId || ''}
                disabled={!!sel.locked}
                onChange={e => {
                  const val = e.target.value;
                  actions.updRecipe(sel.id, { linkedCostingId: val || null });
                  setSel({ ...sel, linkedCostingId: val || null });
                }}
                style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '7px 10px', outline: 'none', cursor: sel.locked ? 'not-allowed' : 'pointer', borderRadius: '3px', opacity: sel.locked ? 0.5 : 1 }}
              >
                <option value=''>— No costing linked —</option>
                {state.gpHistory.map((h: any) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {(h.pct || 0).toFixed(1)}% GP · £{(h.sell || 0).toFixed(2)} sell
                  </option>
                ))}
              </select>
            </div>

            {linkedCosting ? (
              <div>
                {/* GP summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid ' + C.border }}>
                  {[
                    { l: 'Sell', v: sym + (linkedCosting.sell||0).toFixed(2) },
                    { l: 'Cost/Cover', v: sym + (linkedCosting.cost||0).toFixed(2) },
                    { l: 'GP £', v: sym + (linkedCosting.gp||0).toFixed(2) },
                    { l: 'GP %', v: (linkedCosting.pct||0).toFixed(1) + '%', highlight: true },
                  ].map((cell, i) => (
                    <div key={cell.l} style={{ padding: '14px', textAlign: 'center', borderRight: i < 3 ? '1px solid ' + C.border : 'none' }}>
                      <p style={{ fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>{cell.l}</p>
                      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: cell.highlight ? gpColor(linkedCosting.pct||0, linkedCosting.target||gpTarget, C) : C.text }}>{cell.v}</p>
                    </div>
                  ))}
                </div>

                {/* Benchmark bars — target + business min only */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border }}>
                  {[
                    { l: 'This dish', v: linkedCosting.pct||0, c: gpColor(linkedCosting.pct||0, linkedCosting.target||gpTarget, C) },
                    { l: 'Target ' + (linkedCosting.target||gpTarget) + '%', v: linkedCosting.target||gpTarget, c: C.greenLight },
                  ].map(b => (
                    <div key={b.l} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.faint, marginBottom: '3px' }}>
                        <span>{b.l}</span><span style={{ color: b.c }}>{b.v.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '3px', background: C.surface3, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '3px', background: b.c, width: Math.min(Math.max(b.v, 0), 100) + '%', borderRadius: '2px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ingredients table — read-only in view mode */}
                {!editMode && (linkedCosting.ingredients||[]).length > 0 && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', padding: '10px 16px', background: C.surface2, borderBottom: '1px solid ' + C.border }}>
                      {['Ingredient','Qty','Cost/unit','Line cost'].map(h => (
                        <p key={h} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint }}>{h}</p>
                      ))}
                    </div>
                    {linkedCosting.ingredients.map((ing: any) => (
                      <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', padding: '10px 16px', borderBottom: '1px solid ' + C.border, alignItems: 'center' }}>
                        <p style={{ fontSize: '13px', color: C.text }}>{ing.name}</p>
                        <p style={{ fontSize: '13px', color: C.dim }}>{ing.qty}{ing.unit}</p>
                        <p style={{ fontSize: '13px', color: C.dim }}>{sym}{(ing.price||0).toFixed(2)}</p>
                        <p style={{ fontSize: '13px', color: C.gold }}>{sym}{(ing.line||0).toFixed(3)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ingredients table — editable in edit mode, bound to editCostingIngs.
                    Each change debounce-saves into gpHistory (see useEffect above)
                    and bank-ensures new names so the Bank tab fills out passively. */}
                {editMode && (
                  <div>
                    <div style={{ padding: '10px 16px', background: C.surface2, borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint }}>Ingredients — auto-save into linked costing</p>
                      <p style={{ fontSize: '10px', color: C.gold }}>↗ Also added to your Bank</p>
                    </div>
                    <div style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 80px 90px 70px 32px', gap: '6px', marginBottom: '6px' }}>
                        {['Ingredient','Qty','Unit','Cost/unit','Line',''].map(h => (
                          <p key={h} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint }}>{h}</p>
                        ))}
                      </div>
                      {editCostingIngs.length === 0 && (
                        <p style={{ fontSize: '12px', color: C.faint, padding: '8px 0' }}>No ingredients in this costing yet — add one below.</p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {editCostingIngs.map(row => {
                          const matches = eciSuggestRow === row.id ? ilcBankMatches(row.name) : [];
                          const isDuplicate = eciIsDuplicateName(row.id, row.name);
                          const exactBank = row.name && (state.ingredientsBank || []).some((b: any) => (b.name || '').toLowerCase().trim() === row.name.toLowerCase().trim());
                          const showDropdown = eciSuggestRow === row.id && (row.name || '').trim().length > 0;
                          return (
                            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 80px 90px 70px 32px', gap: '6px', alignItems: 'center' }}>
                              <div style={{ position: 'relative' }}>
                                <input
                                  value={row.name}
                                  onChange={e => eciSetField(row.id, 'name', e.target.value)}
                                  onFocus={() => setEciSuggestRow(row.id)}
                                  onBlur={e => {
                                    eciAutofillPrice(row.id, e.target.value);
                                    setTimeout(() => { setEciSuggestRow(prev => prev === row.id ? null : prev); }, 150);
                                  }}
                                  onKeyDown={e => { if (e.key === 'Escape') setEciSuggestRow(null); }}
                                  placeholder="Name"
                                  style={{ ...inp, fontSize: '12px', padding: '7px 9px', border: '1px solid ' + (isDuplicate ? C.red : exactBank ? C.gold + '60' : C.border) }}
                                />
                                {showDropdown && (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: '2px', background: C.surface, border: '1px solid ' + C.border, borderRadius: '3px', maxHeight: '220px', overflow: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }}>
                                    {isDuplicate && (
                                      <p style={{ fontSize: '11px', color: C.red, padding: '7px 10px', borderBottom: '0.5px solid ' + C.border, background: C.red + '0E' }}>
                                        ⚠ Already in this costing
                                      </p>
                                    )}
                                    {matches.length > 0 ? (
                                      matches.map(m => (
                                        <button key={m.id}
                                          onMouseDown={e => { e.preventDefault(); eciPickBank(row.id, m); }}
                                          style={{ display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 10px', background: 'transparent', border: 'none', borderBottom: '0.5px solid ' + C.border, color: C.text, fontSize: '12px', cursor: 'pointer' }}>
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                                          <span style={{ fontSize: '10px', color: C.faint, flexShrink: 0 }}>
                                            {m.unit || ''}{m.unitPrice != null ? ` · ${sym}${Number(m.unitPrice).toFixed(2)}` : ''}
                                          </span>
                                        </button>
                                      ))
                                    ) : (
                                      <p style={{ fontSize: '11px', color: C.faint, padding: '8px 10px', fontStyle: 'italic' }}>
                                        No bank match — adds as new on save
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <input type="number" value={row.qty} onChange={e => eciSetField(row.id, 'qty', e.target.value)} placeholder="0" style={{ ...inp, fontSize: '12px', padding: '7px 9px' }} />
                              <select value={row.unit} onChange={e => eciSetField(row.id, 'unit', e.target.value)} style={{ ...inp, fontSize: '12px', padding: '7px 9px' }}>
                                {ILC_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                              <input type="number" value={row.price} onChange={e => eciSetField(row.id, 'price', e.target.value)} placeholder="0.00" style={{ ...inp, fontSize: '12px', padding: '7px 9px' }} />
                              <span style={{ fontSize: '12px', color: C.gold, textAlign: 'right' }}>{sym}{(parseFloat(row.line)||0).toFixed(3)}</span>
                              <button onClick={() => eciRemoveRow(row.id)} title="Remove" style={{ fontSize: '13px', color: C.red, background: 'transparent', border: '1px solid ' + C.border, padding: '5px 0', cursor: 'pointer', borderRadius: '2px' }}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={eciAddRow}
                        style={{ marginTop: '10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '30', padding: '7px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                        + Add ingredient
                      </button>
                    </div>
                  </div>
                )}

                {/* GP advice */}
                <div style={{ padding: '12px 16px', background: (linkedCosting.pct||0) >= (linkedCosting.target||gpTarget) ? C.green + '08' : C.red + '06' }}>
                  <p style={{ fontSize: '12px', color: (linkedCosting.pct||0) >= (linkedCosting.target||gpTarget) ? C.greenLight : C.red }}>
                    {(linkedCosting.pct||0) >= (linkedCosting.target||gpTarget)
                      ? 'On target — GP of ' + (linkedCosting.pct||0).toFixed(1) + '% meets your ' + (linkedCosting.target||gpTarget) + '% goal.'
                      : 'Below target — price at ' + sym + (linkedCosting.cost / (1 - (linkedCosting.target||gpTarget) / 100)).toFixed(2) + ' to hit ' + (linkedCosting.target||gpTarget) + '%.'}
                  </p>
                </div>
              </div>
            ) : (
              !assigningCosting && !showInlineCosting && (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: C.faint, marginBottom: '8px' }}>No costing linked to this recipe.</p>
                  <p style={{ fontSize: '12px', color: C.faint, marginBottom: '14px' }}>Link a saved costing above, or build one here without leaving the recipe.</p>
                  <button onClick={openInlineCosting} disabled={!!sel.locked}
                    title={sel.locked ? 'Recipe is locked' : ''}
                    style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: sel.locked ? C.faint : C.bg, background: sel.locked ? 'transparent' : C.gold, border: sel.locked ? '1px solid ' + C.border : 'none', padding: '9px 16px', cursor: sel.locked ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: sel.locked ? 0.5 : 1 }}>
                    + Add costing for this dish
                  </button>
                </div>
              )
            )}

            {/* Inline costing builder */}
            {showInlineCosting && !linkedCosting && (() => {
              const sellNum = parseFloat(ilcSell) || 0;
              const portionsNum = parseInt(ilcPortions) || 1;
              const totalCost = ilcIngs.reduce((a, b) => a + (parseFloat(b.line) || 0), 0);
              const costPerPortion = totalCost / portionsNum;
              const gpVal = sellNum - costPerPortion;
              const pctVal = sellNum > 0 ? (gpVal / sellNum) * 100 : 0;
              const pctColor = gpColor(pctVal, gpTarget, C);
              const hasName = ilcIngs.some(r => (r.name||'').trim() !== '');
              return (
                <div style={{ borderTop: '1px solid ' + C.border, background: C.gold + '06' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.gold }}>Build a costing for &ldquo;{sel.title}&rdquo;</p>
                    <button onClick={() => setShowInlineCosting(false)}
                      style={{ fontSize: '11px', color: C.faint, background: 'transparent', border: '1px solid ' + C.border, padding: '5px 10px', cursor: 'pointer', borderRadius: '2px' }}>
                      Cancel
                    </button>
                  </div>

                  {/* Sell + portions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '14px 16px', borderBottom: '1px solid ' + C.border }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '5px' }}>Sell price ({sym})</label>
                      <input type="number" value={ilcSell} onChange={e => setIlcSell(e.target.value)} placeholder="0.00" style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '5px' }}>Portions</label>
                      <input type="number" min="1" value={ilcPortions} onChange={e => setIlcPortions(e.target.value)} style={inp} />
                    </div>
                  </div>

                  {/* Ingredient rows */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 80px 90px 70px 32px', gap: '6px', marginBottom: '8px' }}>
                      {['Ingredient','Qty','Unit','Cost/unit','Line','' ].map(h => (
                        <p key={h} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint }}>{h}</p>
                      ))}
                    </div>
                    {ilcIngs.length === 0 && (
                      <p style={{ fontSize: '12px', color: C.faint, padding: '8px 0' }}>No ingredients yet — add one below.</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {ilcIngs.map(row => {
                        const matches = ilcSuggestRow === row.id ? ilcBankMatches(row.name) : [];
                        const isDuplicate = ilcIsDuplicateName(row.id, row.name);
                        const exactBank = row.name && (state.ingredientsBank || []).some((b: any) => (b.name || '').toLowerCase().trim() === row.name.toLowerCase().trim());
                        const showDropdown = ilcSuggestRow === row.id && (row.name || '').trim().length > 0;
                        return (
                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 80px 90px 70px 32px', gap: '6px', alignItems: 'center' }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              value={row.name}
                              onChange={e => ilcSetField(row.id, 'name', e.target.value)}
                              onFocus={() => setIlcSuggestRow(row.id)}
                              onBlur={e => {
                                ilcAutofillPrice(row.id, e.target.value);
                                // Delay closing so a mousedown on a suggestion fires first
                                setTimeout(() => {
                                  setIlcSuggestRow(prev => prev === row.id ? null : prev);
                                }, 150);
                              }}
                              onKeyDown={e => { if (e.key === 'Escape') setIlcSuggestRow(null); }}
                              placeholder="Name"
                              style={{
                                ...inp, fontSize: '12px', padding: '7px 9px',
                                border: '1px solid ' + (isDuplicate ? C.red : exactBank ? C.gold + '60' : C.border),
                              }}
                            />
                            {showDropdown && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: '2px', background: C.surface, border: '1px solid ' + C.border, borderRadius: '3px', maxHeight: '220px', overflow: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }}>
                                {isDuplicate && (
                                  <p style={{ fontSize: '11px', color: C.red, padding: '7px 10px', borderBottom: '0.5px solid ' + C.border, background: C.red + '0E' }}>
                                    ⚠ Already added to this costing
                                  </p>
                                )}
                                {matches.length > 0 ? (
                                  matches.map(m => (
                                    <button key={m.id}
                                      onMouseDown={e => { e.preventDefault(); ilcPickBank(row.id, m); }}
                                      style={{ display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 10px', background: 'transparent', border: 'none', borderBottom: '0.5px solid ' + C.border, color: C.text, fontSize: '12px', cursor: 'pointer' }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                                      <span style={{ fontSize: '10px', color: C.faint, flexShrink: 0 }}>
                                        {m.unit || ''}{m.unitPrice != null ? ` · ${sym}${Number(m.unitPrice).toFixed(2)}` : ''}
                                      </span>
                                    </button>
                                  ))
                                ) : (
                                  <p style={{ fontSize: '11px', color: C.faint, padding: '8px 10px', fontStyle: 'italic' }}>
                                    No bank match — saves as new on costing save
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <input
                            type="number"
                            value={row.qty}
                            onChange={e => ilcSetField(row.id, 'qty', e.target.value)}
                            placeholder="0"
                            style={{ ...inp, fontSize: '12px', padding: '7px 9px' }}
                          />
                          <select
                            value={row.unit}
                            onChange={e => ilcSetField(row.id, 'unit', e.target.value)}
                            style={{ ...inp, fontSize: '12px', padding: '7px 9px' }}
                          >
                            {ILC_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input
                            type="number"
                            value={row.price}
                            onChange={e => ilcSetField(row.id, 'price', e.target.value)}
                            placeholder="0.00"
                            style={{ ...inp, fontSize: '12px', padding: '7px 9px' }}
                          />
                          <span style={{ fontSize: '12px', color: C.gold, textAlign: 'right' }}>{sym}{(parseFloat(row.line)||0).toFixed(3)}</span>
                          <button onClick={() => ilcRemoveRow(row.id)} title="Remove"
                            style={{ fontSize: '13px', color: C.red, background: 'transparent', border: '1px solid ' + C.border, padding: '5px 0', cursor: 'pointer', borderRadius: '2px' }}>
                            ✕
                          </button>
                        </div>
                      );
                      })}
                    </div>
                    <button onClick={ilcAddRow}
                      style={{ marginTop: '10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '30', padding: '7px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                      + Add ingredient
                    </button>
                  </div>

                  {/* Live GP summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid ' + C.border, background: C.surface }}>
                    {[
                      { l: 'Sell', v: sym + sellNum.toFixed(2) },
                      { l: 'Cost/Cover', v: sym + costPerPortion.toFixed(2) },
                      { l: 'GP £', v: sym + gpVal.toFixed(2) },
                      { l: 'GP %', v: sellNum > 0 ? pctVal.toFixed(1) + '%' : '—', highlight: true },
                    ].map((cell, i) => (
                      <div key={cell.l} style={{ padding: '12px', textAlign: 'center', borderRight: i < 3 ? '1px solid ' + C.border : 'none' }}>
                        <p style={{ fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>{cell.l}</p>
                        <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '18px', color: cell.highlight && sellNum > 0 ? pctColor : C.text }}>{cell.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Save */}
                  <div style={{ padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <p style={{ fontSize: '11px', color: C.faint, marginRight: 'auto' }}>Saves to your costing history and links to this recipe.</p>
                    <button onClick={() => setShowInlineCosting(false)}
                      style={{ fontSize: '12px', color: C.dim, background: C.surface2, border: '1px solid ' + C.border, padding: '9px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                      Cancel
                    </button>
                    <button onClick={saveInlineCosting} disabled={!hasName || sellNum <= 0 || ilcSaving}
                      style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '9px 18px', cursor: (!hasName || sellNum <= 0 || ilcSaving) ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: (!hasName || sellNum <= 0 || ilcSaving) ? 0.4 : 1 }}>
                      {ilcSaving ? 'Saving…' : 'Save Costing'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Ingredients live in the linked costing — see the Costing panel above.
            The legacy `imported.ingredients` strings are kept on the recipe
            record (for the print, recipe book, and as a fallback when no
            costing is linked) but no longer rendered as a separate section. */}

        {/* Method */}
        {!editMode && sel.imported?.method?.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Method</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sel.imported.method.map((step: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '16px', padding: '14px 16px', background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: C.gold, fontWeight: 700 }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: C.text, lineHeight: 1.7 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allergens — unified per-allergen tri-state (None / May / Contains).
            Bank-matched ingredients lock the Contains state; user can add manual
            overrides for allergens the Bank didn't flag (e.g. recipe with no costing). */}
        {(() => {
          const linked = getLinkedCosting(sel);
          const computed = computeFromBank(linked, state.ingredientsBank || []);

          // Which ingredient(s) caused each allergen — for the "From Bank: x" caption
          const sources: Record<string, string[]> = {};
          if (linked?.ingredients) {
            for (const ing of linked.ingredients) {
              const bankItem = (state.ingredientsBank || []).find((b: any) =>
                (b.name||'').toLowerCase().trim() === (ing.name||'').toLowerCase().trim());
              if (!bankItem) continue;
              for (const k of (bankItem.allergens?.contains || [])) {
                if (!sources[k]) sources[k] = [];
                if (!sources[k].includes(ing.name)) sources[k].push(ing.name);
              }
            }
          }

          const userContains: string[] = sel.allergens?.contains || [];
          const userMay: string[] = sel.allergens?.mayContain || [];
          const userNuts: string[] = sel.allergens?.nutTypes || [];
          const userGlutens: string[] = sel.allergens?.glutenTypes || [];
          const locked = !!sel.locked;

          function setAllergenState(key: string, target: 'none' | 'may' | 'contains') {
            const cur = sel.allergens || {};
            const nextContains = (cur.contains || []).filter((k: string) => k !== key);
            const nextMay = (cur.mayContain || []).filter((k: string) => k !== key);
            if (target === 'may') nextMay.push(key);
            if (target === 'contains') nextContains.push(key);
            // If we're moving away from contains for nuts/gluten, clean stray sub-types too
            let nutTypes = cur.nutTypes || [];
            let glutenTypes = cur.glutenTypes || [];
            if (key === 'nuts' && target !== 'contains') nutTypes = [];
            if (key === 'gluten' && target !== 'contains') glutenTypes = [];
            const next = { ...cur, contains: nextContains, mayContain: nextMay, nutTypes, glutenTypes };
            actions.updRecipe(sel.id, { allergens: next });
            setSel((prev: any) => prev ? { ...prev, allergens: next } : prev);
          }
          function toggleSubtype(field: 'nutTypes' | 'glutenTypes', type: string) {
            const cur = sel.allergens || {};
            const list = (cur[field] || []) as string[];
            const next = list.includes(type) ? list.filter(t => t !== type) : [...list, type];
            const allergens = { ...cur, [field]: next };
            actions.updRecipe(sel.id, { allergens });
            setSel((prev: any) => prev ? { ...prev, allergens } : prev);
          }

          return (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>Allergens — UK FIR 14</p>
                  <p style={{ fontSize: '11px', color: C.faint, marginTop: '3px' }}>Pick a state for each. Bank-matched ingredients lock Contains automatically — change the Bank entry to override.</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => setShowSpec(true)}
                    style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: 'transparent', border: '1px solid ' + C.gold + '40', padding: '5px 10px', cursor: 'pointer', borderRadius: '2px' }}>
                    Spec Sheet
                  </button>
                  <button onClick={() => setShowCompliance(true)}
                    style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: 'transparent', border: '1px solid ' + C.gold + '40', padding: '5px 10px', cursor: 'pointer', borderRadius: '2px' }}>
                    Compliance Check
                  </button>
                </div>
              </div>

              {!linked && (
                <p style={{ fontSize: '11px', color: C.faint, padding: '8px 12px', background: C.surface2, border: '0.5px dashed ' + C.border, borderRadius: '3px', marginBottom: '12px' }}>
                  No costing linked — Bank auto-detection is inactive. You can still set states manually below.
                </p>
              )}
              {linked && computed.unmatched.length > 0 && (
                <p style={{ fontSize: '11px', color: C.gold, padding: '8px 12px', background: C.gold + '0F', border: '0.5px solid ' + C.gold + '40', borderRadius: '3px', marginBottom: '12px' }}>
                  ⚠ {computed.unmatched.length} ingredient{computed.unmatched.length === 1 ? '' : 's'} not in Bank — auto-detection may miss allergens for: {computed.unmatched.slice(0, 5).join(', ')}{computed.unmatched.length > 5 ? '…' : ''}
                </p>
              )}

              {/* 14 allergen rows in a 2-col grid (1-col on mobile) */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px' }}>
                {ALLERGENS.map(a => {
                  const fromBank = computed.contains.has(a.key);
                  const isContains = fromBank || userContains.includes(a.key);
                  const isMay = !isContains && userMay.includes(a.key);
                  const isNone = !isContains && !isMay;
                  const bankLocked = fromBank;
                  const rowDisabled = locked || bankLocked;

                  const seg = (label: string, active: boolean, target: 'none'|'may'|'contains', color: string) => (
                    <button
                      key={target}
                      onClick={() => !rowDisabled && setAllergenState(a.key, target)}
                      disabled={rowDisabled}
                      title={bankLocked ? 'Bank-sourced — change the Bank entry to override' : (locked ? 'Recipe is locked' : '')}
                      style={{
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                        padding: '5px 8px', minWidth: '56px',
                        border: active ? '1px solid ' + color : '1px solid ' + C.border,
                        color: active ? color : C.faint,
                        background: active ? color + '14' : 'transparent',
                        cursor: rowDisabled ? 'not-allowed' : 'pointer',
                        opacity: rowDisabled && !active ? 0.45 : 1,
                        borderRadius: 0,
                      }}>
                      {label}
                    </button>
                  );

                  const borderCol = isContains ? C.red + '60' : isMay ? C.gold + '60' : C.border;
                  const bgCol = isContains ? C.red + '0C' : isMay ? C.gold + '0C' : C.surface2;

                  return (
                    <div key={a.key} style={{
                      display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: bgCol,
                      border: '0.5px solid ' + borderCol,
                      borderRadius: '3px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: isContains ? C.red : C.faint, background: C.surface, border: '0.5px solid ' + (isContains ? C.red + '40' : C.border), padding: '1px 5px', borderRadius: '2px', flexShrink: 0, letterSpacing: '0.5px' }}>{a.short}</span>
                          <span style={{ fontSize: '13px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</span>
                        </div>
                        {fromBank && sources[a.key]?.length > 0 && (
                          <p style={{ fontSize: '10px', color: C.red, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`From Bank: ${sources[a.key].join(', ')}`}>
                            From Bank: {sources[a.key].slice(0, 2).join(', ')}{sources[a.key].length > 2 ? ` +${sources[a.key].length - 2}` : ''}
                          </p>
                        )}
                        {!fromBank && isContains && (
                          <p style={{ fontSize: '10px', color: C.red, marginTop: '2px' }}>Manual override</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexShrink: 0, borderRadius: '2px', overflow: 'hidden' }}>
                        {seg('None', isNone, 'none', C.dim)}
                        {seg('May', isMay, 'may', C.gold)}
                        {seg('Contains', isContains, 'contains', C.red)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tree-nut sub-types — when contains nuts (bank or user) */}
              {(computed.contains.has('nuts') || userContains.includes('nuts')) && (
                <div style={{ marginTop: '12px', padding: '10px 12px', background: C.red + '08', border: '0.5px solid ' + C.red + '40', borderRadius: '3px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.red, marginBottom: '6px' }}>
                    Tree nuts — name the specific nut <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: C.faint }}>(UK FIR 2014)</span>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {NUT_TYPES.map(t => {
                      const fromBank = computed.nutTypes.has(t);
                      const userOn = userNuts.includes(t);
                      const on = fromBank || userOn;
                      const subLocked = locked || fromBank;
                      return (
                        <button key={t} disabled={subLocked}
                          title={fromBank ? 'From Bank — change the Bank entry to override' : (locked ? 'Recipe is locked' : '')}
                          onClick={() => !subLocked && toggleSubtype('nutTypes', t)}
                          style={{ fontSize: '11px', padding: '4px 9px', border: '1px solid ' + (on ? C.red : C.border), color: on ? C.red : C.dim, background: on ? C.red + '14' : 'transparent', cursor: subLocked ? 'not-allowed' : 'pointer', borderRadius: '2px', fontWeight: on ? 700 : 400, opacity: subLocked && !on ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {on && <span style={{ fontSize: '11px', lineHeight: 1 }}>✓</span>}{t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gluten cereal sub-types — when contains gluten */}
              {(computed.contains.has('gluten') || userContains.includes('gluten')) && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: C.red + '08', border: '0.5px solid ' + C.red + '40', borderRadius: '3px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.red, marginBottom: '6px' }}>
                    Gluten cereal — name the specific cereal <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: C.faint }}>(UK FIR 2014)</span>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {GLUTEN_TYPES.map(t => {
                      const fromBank = computed.glutenTypes.has(t);
                      const userOn = userGlutens.includes(t);
                      const on = fromBank || userOn;
                      const subLocked = locked || fromBank;
                      return (
                        <button key={t} disabled={subLocked}
                          title={fromBank ? 'From Bank — change the Bank entry to override' : (locked ? 'Recipe is locked' : '')}
                          onClick={() => !subLocked && toggleSubtype('glutenTypes', t)}
                          style={{ fontSize: '11px', padding: '4px 9px', border: '1px solid ' + (on ? C.red : C.border), color: on ? C.red : C.dim, background: on ? C.red + '14' : 'transparent', cursor: subLocked ? 'not-allowed' : 'pointer', borderRadius: '2px', fontWeight: on ? 700 : 400, opacity: subLocked && !on ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {on && <span style={{ fontSize: '11px', lineHeight: 1 }}>✓</span>}{t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Nutrition (computed) */}
        {(() => {
          const linked = getLinkedCosting(sel);
          const computed = computeFromBank(linked, state.ingredientsBank || []);
          if (!linked || computed.matched === 0) return null;
          const portions = parseFloat(linked.portions) || 1;
          const hasAny = NUTRITION_FIELDS.some(f => computed.nutrition[f.key] != null);
          if (!hasAny) {
            return (
              <div style={{ marginBottom: '24px', padding: '14px', background: C.surface2, border: '0.5px dashed ' + C.border, borderRadius: '3px' }}>
                <p style={{ fontSize: '12px', color: C.faint }}>No nutrition data — fill in nutrition fields on Bank ingredients (per 100g/ml) to see totals here.</p>
              </div>
            );
          }
          const coveragePct = computed.nutritionTotal > 0 ? Math.round((computed.nutritionCoverage / computed.nutritionTotal) * 100) : 0;
          // per-100g of finished dish — uses the weight we actually computed nutrition for
          const dishGrams = computed.nutritionCoverage;
          return (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>
                Nutrition <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(per portion · {portions} portion{portions === 1 ? '' : 's'} · UK FOP traffic lights apply per 100g)</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {NUTRITION_FIELDS.map(f => {
                  const total = computed.nutrition[f.key];
                  if (total == null) return null;
                  const perPortion = total / portions;
                  const per100 = dishGrams > 0 ? (total * 100) / dishGrams : null;
                  const light = per100 != null ? trafficLight(f.key, per100) : null;
                  const lc = light ? lightColors(C, light) : null;
                  const decimals = f.unit === 'g' ? 1 : 0;
                  return (
                    <div key={f.key} style={{
                      background: lc ? lc.bg : C.surface2,
                      border: '0.5px solid ' + (lc ? lc.bd : C.border),
                      padding: '10px 12px', borderRadius: '3px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <p style={{ fontSize: '10px', color: C.faint }}>{f.label}</p>
                        {light && lc && (
                          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: 0.4, color: lc.fg, background: 'transparent', border: '0.5px solid ' + lc.fg, padding: '1px 5px', borderRadius: '2px' }}>
                            {LIGHT_LABEL[light]}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '15px', color: lc ? lc.fg : C.text, fontWeight: 600 }}>{perPortion.toFixed(decimals)}<span style={{ fontSize: '10px', color: C.faint, fontWeight: 400, marginLeft: '3px' }}>{f.unit}</span></p>
                      <p style={{ fontSize: '10px', color: C.faint, marginTop: '2px' }}>
                        {per100 != null ? `${per100.toFixed(decimals)}${f.unit}/100g · ` : ''}total {total.toFixed(decimals)}{f.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: C.faint, marginTop: '8px' }}>
                Traffic lights follow UK Department of Health 2013 FOP guidance for fat, saturates, sugars, and salt per 100g.
                {coveragePct < 100 && (
                  <span style={{ color: C.gold }}> ⚠ Computed from {coveragePct}% of recipe weight — add nutrition data to remaining Bank ingredients for full accuracy.</span>
                )}
              </p>
            </div>
          );
        })()}

        {/* Used in — dishes that consume this recipe as a sub-recipe */}
        {(() => {
          const usedIn = (state.gpHistory || []).filter((h: any) =>
            (h.ingredients || []).some((ing: any) => ing.sourceRecipeId === sel.id)
          );
          if (usedIn.length === 0) return null;
          return (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>
                Used in <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: C.faint }}>({usedIn.length} dish{usedIn.length === 1 ? '' : 'es'} use this as a sub-recipe)</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {usedIn.map((h: any) => (
                  <span key={h.id} style={{ fontSize: '11px', padding: '5px 10px', border: '1px solid ' + C.gold + '40', color: C.gold, background: C.gold + '10', borderRadius: '2px' }}>
                    {h.name} <span style={{ color: C.faint, marginLeft: '4px' }}>· {(h.pct || 0).toFixed(1)}% GP</span>
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: C.faint, marginTop: '6px' }}>
                If you change this recipe&apos;s costing, re-open these dishes in the Costing tab to refresh their cost from the new sub-recipe price.
              </p>
            </div>
          );
        })()}

        {/* Chef notes */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Chef&apos;s Notes</p>
          <textarea
            value={editMode ? editNotes : (sel.notes || '')}
            readOnly={!!sel.locked && !editMode}
            onChange={e => editMode ? setEditNotes(e.target.value) : actions.updRecipe(sel.id, { notes: e.target.value })}
            placeholder={sel.locked ? 'Locked — unlock to edit' : 'Techniques, adaptations, ideas...'} rows={4}
            style={{ ...inp, resize: 'none', opacity: sel.locked && !editMode ? 0.7 : 1, cursor: sel.locked && !editMode ? 'not-allowed' : 'text' }}
          />
        </div>

        {/* Delete (hidden when locked) */}
        {!editMode && !sel.locked && (
          <div style={{ borderTop: '1px solid ' + C.border, paddingTop: '20px' }}>
            {deleteId === sel.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: C.red }}>Delete this recipe?</p>
                <button onClick={() => setDeleteId(null)} style={{ fontSize: '12px', color: C.dim, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => { actions.delRecipe(sel.id); setSel(null); setDeleteId(null); }}
                  style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: C.red, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                  Confirm Delete
                </button>
              </div>
            ) : (
              <button onClick={() => setDeleteId(sel.id)}
                style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.red, border: '1px solid ' + C.red, background: 'transparent', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                Delete Recipe
              </button>
            )}
          </div>
        )}
        {!editMode && sel.locked && (
          <div style={{ borderTop: '1px solid ' + C.border, paddingTop: '20px' }}>
            <p style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>Recipe is locked. Unlock from the header to enable Edit and Delete.</p>
          </div>
        )}

        {/* Compliance modal */}
        {showCompliance && (() => {
          const linked = getLinkedCosting(sel);
          const computed = computeFromBank(linked, state.ingredientsBank || []);
          const importedCount = sel.imported?.ingredients?.length || 0;
          const linkedCount = linked?.ingredients?.length || 0;
          const ingTotal = Math.max(importedCount, linkedCount);
          // Effective contains = bank-computed ∪ user-manual override
          const contains = Array.from(new Set<string>([
            ...Array.from(computed.contains),
            ...(sel.allergens?.contains || []),
          ]));
          const mayContain = sel.allergens?.mayContain || [];
          const nutTypes = Array.from(new Set<string>([
            ...Array.from(computed.nutTypes),
            ...(sel.allergens?.nutTypes || []),
          ]));
          const glutenTypes = Array.from(new Set<string>([
            ...Array.from(computed.glutenTypes),
            ...(sel.allergens?.glutenTypes || []),
          ]));

          type Status = 'pass' | 'warn' | 'fail';
          const checks: { label: string; status: Status; detail: string; source: string }[] = [
            {
              source: "Natasha's Law",
              label: 'Recipe has a name',
              status: sel.title ? 'pass' : 'fail',
              detail: sel.title ? sel.title : 'Add a recipe title — required on the label',
            },
            {
              source: "Natasha's Law",
              label: 'Full ingredient list',
              status: ingTotal > 0 ? 'pass' : 'fail',
              detail: ingTotal > 0
                ? `${ingTotal} ingredients (${importedCount > 0 ? 'imported' : 'from linked costing'})`
                : 'PPDS food must show every ingredient. Import the recipe or link a costing.',
            },
            {
              source: 'Palate & Pen',
              label: 'Ingredients linked to Bank',
              status: linkedCount === 0 ? 'fail' : (computed.unmatched.length === 0 ? 'pass' : 'warn'),
              detail: linkedCount === 0
                ? 'Allergens cannot be computed without a linked costing'
                : computed.unmatched.length === 0
                  ? `All ${computed.matched} ingredients matched`
                  : `${computed.unmatched.length} not in Bank: ${computed.unmatched.slice(0, 3).join(', ')}${computed.unmatched.length > 3 ? '…' : ''}`,
            },
            {
              source: 'FIR 2014',
              label: 'Allergens reviewed',
              status: (contains.length + mayContain.length) > 0 ? 'pass' : (computed.matched > 0 ? 'warn' : 'pass'),
              detail: (contains.length + mayContain.length) > 0
                ? `${contains.length} contains (computed), ${mayContain.length} may contain`
                : 'No allergens detected — confirm Bank entries are tagged correctly',
            },
          ];
          if (contains.includes('nuts')) {
            checks.push({
              source: 'FIR 2014',
              label: 'Tree nut named',
              status: nutTypes.length > 0 ? 'pass' : 'fail',
              detail: nutTypes.length > 0
                ? nutTypes.join(', ')
                : 'UK law requires naming the specific nut. Open the Bank tab and tag the relevant ingredient.',
            });
          }
          if (contains.includes('gluten')) {
            checks.push({
              source: 'FIR 2014',
              label: 'Gluten cereal named',
              status: glutenTypes.length > 0 ? 'pass' : 'fail',
              detail: glutenTypes.length > 0
                ? glutenTypes.join(', ')
                : 'UK law requires naming the cereal. Open the Bank tab and tag the relevant ingredient.',
            });
          }

          const fails = checks.filter(c => c.status === 'fail').length;
          const warns = checks.filter(c => c.status === 'warn').length;
          const compliant = fails === 0;
          const statusColor = fails > 0 ? C.red : (warns > 0 ? C.gold : C.greenLight);
          const iconFor = (s: Status) => s === 'pass' ? '✓' : s === 'warn' ? '⚠' : '✗';
          const colorFor = (s: Status) => s === 'pass' ? C.greenLight : s === 'warn' ? C.gold : C.red;

          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
              <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
                  <div>
                    <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>Allergen Compliance</h3>
                    <p style={{ fontSize: '12px', color: C.faint, marginTop: '2px' }}>UK FIR 2014 + Natasha&apos;s Law</p>
                  </div>
                  <button onClick={() => setShowCompliance(false)} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ padding: '16px 20px', background: statusColor + '14', borderBottom: '1px solid ' + C.border }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: statusColor, letterSpacing: '0.5px' }}>
                    {compliant ? '✓ Compliant' : `✗ Not compliant — ${fails} issue${fails === 1 ? '' : 's'}`}
                    {warns > 0 && <span style={{ color: C.gold, marginLeft: 8, fontWeight: 400 }}>+ {warns} warning{warns === 1 ? '' : 's'}</span>}
                  </p>
                </div>

                <div style={{ padding: '12px 20px' }}>
                  {checks.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: i < checks.length - 1 ? '0.5px solid ' + C.border : 'none' }}>
                      <span style={{ fontSize: '18px', color: colorFor(c.status), lineHeight: 1, flexShrink: 0, width: '20px', textAlign: 'center' }}>{iconFor(c.status)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: '13px', color: C.text, fontWeight: 500 }}>{c.label}</span>
                          <span style={{ fontSize: '10px', color: C.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>{c.source}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: c.status === 'fail' ? C.red : C.faint, lineHeight: 1.5 }}>{c.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '12px 20px', borderTop: '1px solid ' + C.border, fontSize: '11px', color: C.faint, lineHeight: 1.6 }}>
                  Checks the 14 UK FIR allergens, name-the-nut and name-the-cereal rules, and Natasha&apos;s Law PPDS labelling requirements (recipe name + full ingredient list). Always verify with your EHO if in doubt.
                </div>
              </div>
            </div>
          );
        })()}

        {/* Spec sheet modal */}
        {showSpec && (() => {
          const linked = getLinkedCosting(sel);
          const computed = computeFromBank(linked, state.ingredientsBank || []);
          const portions = parseFloat(linked?.portions) || 1;
          // Effective Contains / sub-types = bank ∪ user-manual override
          const containsArr = Array.from(new Set<string>([
            ...Array.from(computed.contains),
            ...(sel.allergens?.contains || []),
          ]));
          const nutTypesArr = Array.from(new Set<string>([
            ...Array.from(computed.nutTypes),
            ...(sel.allergens?.nutTypes || []),
          ]));
          const glutenTypesArr = Array.from(new Set<string>([
            ...Array.from(computed.glutenTypes),
            ...(sel.allergens?.glutenTypes || []),
          ]));
          const mayContain = sel.allergens?.mayContain || [];
          const dishGrams = computed.nutritionCoverage;
          const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          const sellPrice = linked ? parseFloat(linked.sell) || 0 : 0;
          const gpPct = linked ? linked.pct : null;

          return (
            <>
              {/* Print-only CSS — hides everything except the spec sheet. Recipe modal already printed
                  but with edit chrome; this is a clean A4 layout. */}
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  #spec-sheet-print, #spec-sheet-print * { visibility: visible !important; }
                  #spec-sheet-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px !important; background: white !important; color: #111 !important; }
                  #spec-sheet-controls { display: none !important; }
                  @page { size: A4; margin: 12mm; }
                }
              `}</style>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px', overflow: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '780px', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
                  {/* Controls bar */}
                  <div id="spec-sheet-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: C.surface, border: '1px solid ' + C.border, borderBottom: 'none', borderRadius: '4px 4px 0 0' }}>
                    <p style={{ fontSize: '12px', color: C.faint }}>Spec Sheet · A4 print preview</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => window.print()}
                        style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                        Print
                      </button>
                      <button onClick={() => setShowSpec(false)}
                        style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                        Close
                      </button>
                    </div>
                  </div>

                  {/* The actual sheet — light theme always for print readability */}
                  <div id="spec-sheet-print" style={{ background: '#FFFFFF', color: '#111', padding: '32px 40px', overflow: 'auto', fontFamily: 'system-ui,sans-serif', borderRadius: '0 0 4px 4px' }}>
                    {/* Photo (if any) */}
                    {sel.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sel.photoUrl} alt={sel.title || 'Recipe'} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '3px', marginBottom: '14px' }} />
                    )}
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #DDD', paddingBottom: '14px', marginBottom: '18px' }}>
                      <div>
                        <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: '#111', marginBottom: '6px' }}>{sel.title || 'Untitled recipe'}</h1>
                        <p style={{ fontSize: '12px', color: '#555' }}>{sel.category || 'Other'} · {portions} portion{portions === 1 ? '' : 's'}{sellPrice > 0 ? ` · sell ${(state.profile?.currencySymbol||'£')}${sellPrice.toFixed(2)}` : ''}{gpPct != null ? ` · GP ${gpPct.toFixed(1)}%` : ''}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {/* Palatable wordmark on top — primary brand */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: '#111', fontSize: '20px' }}>P</span>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8960A', marginBottom: '7px' }}></div>
                          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: '#111', fontSize: '20px', letterSpacing: '4px' }}>ALATABLE</span>
                        </div>
                        {/* Business logo / name underneath */}
                        {state.profile?.logoUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={state.profile.logoUrl} alt={state.profile.businessName || 'Logo'} style={{ height: '32px', maxWidth: '120px', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginTop: '6px' }} />
                            {state.profile?.businessName?.trim() && (
                              <p style={{ fontSize: '10px', color: '#555', marginTop: '2px', fontWeight: 600 }}>{state.profile.businessName.trim()}</p>
                            )}
                          </>
                        ) : state.profile?.businessName?.trim() ? (
                          <p style={{ fontSize: '12px', color: '#333', marginTop: '4px', fontWeight: 600 }}>{state.profile.businessName.trim()}</p>
                        ) : (
                          <p style={{ fontSize: '10px', color: '#777', marginTop: '4px' }}>By Palate &amp; Pen</p>
                        )}
                      </div>
                    </div>

                    {/* Ingredients */}
                    <section style={{ marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Ingredients</h2>
                      {linked ? (
                        (linked.ingredients || []).length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                            {linked.ingredients.map((ing: any, i: number) => (
                              <div key={i} style={{ fontSize: '13px', color: '#222', padding: '3px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px dotted #DDD' }}>
                                <span>{ing.name}</span>
                                <span style={{ color: '#555' }}>{ing.qty}{ing.unit}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No ingredients in linked costing yet</p>
                        )
                      ) : sel.imported?.ingredients?.length > 0 ? (
                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                          {sel.imported.ingredients.map((ing: string, i: number) => (
                            <li key={i} style={{ fontSize: '13px', color: '#222', padding: '2px 0' }}>{ing}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No ingredients listed</p>
                      )}
                    </section>

                    {/* Method */}
                    {(sel.imported?.method?.length > 0 || sel.notes?.trim()) && (
                      <section style={{ marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Method</h2>
                        {sel.imported?.method?.length > 0 ? (
                          <ol style={{ paddingLeft: '24px', margin: 0 }}>
                            {sel.imported.method.map((step: string, i: number) => (
                              <li key={i} style={{ fontSize: '12px', color: '#222', padding: '4px 0', lineHeight: 1.55 }}>{step}</li>
                            ))}
                          </ol>
                        ) : (
                          <p style={{ fontSize: '12px', color: '#222', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{sel.notes}</p>
                        )}
                      </section>
                    )}

                    {/* Allergens */}
                    <section style={{ marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Allergens — Contains</h2>
                      {containsArr.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>{computed.matched > 0 ? 'None detected in any of the ' + computed.matched + ' Bank-matched ingredients' : 'No Bank ingredients linked — allergens cannot be determined'}</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {containsArr.map(k => {
                            const a = ALLERGENS.find(x => x.key === k);
                            return a && <span key={k} style={{ fontSize: '11px', fontWeight: 700, color: '#C00', background: '#FEE', border: '1px solid #C00', padding: '4px 10px', borderRadius: '2px' }}>{a.label}</span>;
                          })}
                        </div>
                      )}
                      {nutTypesArr.length > 0 && (
                        <p style={{ fontSize: '12px', color: '#222', marginTop: '8px' }}><strong style={{ color: '#C00' }}>Tree nuts:</strong> {nutTypesArr.join(', ')}</p>
                      )}
                      {glutenTypesArr.length > 0 && (
                        <p style={{ fontSize: '12px', color: '#222', marginTop: '4px' }}><strong style={{ color: '#C00' }}>Cereals:</strong> {glutenTypesArr.join(', ')}</p>
                      )}
                      {mayContain.length > 0 && (
                        <>
                          <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginTop: '14px', marginBottom: '6px' }}>May Contain</h2>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {mayContain.map((k: string) => {
                              const a = ALLERGENS.find(x => x.key === k);
                              return a && <span key={k} style={{ fontSize: '11px', color: '#A77', border: '1px dashed #A77', padding: '3px 8px', borderRadius: '2px' }}>{a.label}</span>;
                            })}
                          </div>
                        </>
                      )}
                    </section>

                    {/* Nutrition */}
                    {(() => {
                      const hasAny = NUTRITION_FIELDS.some(f => computed.nutrition[f.key] != null);
                      if (!hasAny) {
                        return (
                          <section style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Nutrition</h2>
                            <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>Nutrition data not available</p>
                          </section>
                        );
                      }
                      const lightCss = (l: Light | null) => {
                        if (!l) return { fg: '#222', bg: 'transparent', bd: '#DDD' };
                        if (l === 'low')  return { fg: '#1A6B2A', bg: '#E8F5EC', bd: '#1A6B2A' };
                        if (l === 'med')  return { fg: '#A06800', bg: '#FFF4E0', bd: '#A06800' };
                        return                  { fg: '#A00',     bg: '#FEE',     bd: '#A00' };
                      };
                      return (
                        <section style={{ marginBottom: '20px' }}>
                          <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '8px' }}>Nutrition (per portion · {portions} portion{portions === 1 ? '' : 's'})</h2>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: '#F4F4F2', color: '#555' }}>
                                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>Nutrient</th>
                                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>Per portion</th>
                                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>Per 100g</th>
                                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>FOP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {NUTRITION_FIELDS.map(f => {
                                const total = computed.nutrition[f.key];
                                if (total == null) return null;
                                const perPortion = total / portions;
                                const per100 = dishGrams > 0 ? (total * 100) / dishGrams : null;
                                const light = per100 != null ? trafficLight(f.key, per100) : null;
                                const c = lightCss(light);
                                const decimals = f.unit === 'g' ? 1 : 0;
                                return (
                                  <tr key={f.key} style={{ borderBottom: '0.5px solid #EEE' }}>
                                    <td style={{ padding: '6px 8px', color: '#222' }}>{f.label}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#222' }}>{perPortion.toFixed(decimals)}{f.unit}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#555' }}>{per100 != null ? per100.toFixed(decimals) + f.unit : '—'}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                      {light ? (
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: c.fg, background: c.bg, border: '1px solid ' + c.bd, padding: '2px 6px', borderRadius: '2px' }}>{LIGHT_LABEL[light]}</span>
                                      ) : <span style={{ color: '#AAA' }}>—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </section>
                      );
                    })()}

                    {/* Footer */}
                    <div style={{ borderTop: '1px solid #DDD', paddingTop: '12px', marginTop: '20px', fontSize: '10px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Generated by Palatable on {today}</span>
                      <span>UK FIR 2014 + Natasha&apos;s Law · always verify with your EHO</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Cost simulator — per-ingredient % adjuster with live GP recompute.
            Doesn't modify the saved costing; close = discard. Lets a chef
            stress-test "what if salmon goes up 15%?" without touching data. */}
        {showSimulator && (() => {
          const lc = getLinkedCosting(sel);
          if (!lc) return null;
          const portions = parseInt(lc.portions) || 1;
          const sellNum = parseFloat(lc.sell) || 0;
          const target = parseFloat(lc.target) || gpTarget;
          // Recompute every ingredient with its % adjustment applied
          const simIngs = (lc.ingredients || []).map((ing: any) => {
            const adj = simAdjusts[ing.id] || 0;
            const origPrice = parseFloat(ing.price) || 0;
            const newPrice = origPrice * (1 + adj / 100);
            const qty = parseFloat(ing.qty) || 0;
            let line = qty * newPrice;
            if (ing.unit === 'g' || ing.unit === 'ml') line = (qty / 1000) * newPrice;
            return { ...ing, newPrice, newLine: line };
          });
          const newTotal = simIngs.reduce((a: number, i: any) => a + i.newLine, 0);
          const newCost = newTotal / portions;
          const newGp = sellNum - newCost;
          const newPct = sellNum > 0 ? (newGp / sellNum) * 100 : 0;
          const origPct = parseFloat(lc.pct) || 0;
          const deltaPct = newPct - origPct;
          const anyAdjusted = Object.values(simAdjusts).some(v => v !== 0);
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
              <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '640px', maxHeight: '92vh', overflow: 'auto', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid ' + C.border }}>
                  <div>
                    <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>Cost simulator</h3>
                    <p style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{sel.title} — adjust ingredient prices to see GP impact</p>
                  </div>
                  <button onClick={() => setShowSimulator(false)} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
                </div>

                {/* Live stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid ' + C.border }}>
                  {[
                    { l: 'Sell', v: sym + sellNum.toFixed(2) },
                    { l: 'New cost', v: sym + newCost.toFixed(2) },
                    { l: 'New GP %', v: newPct.toFixed(1) + '%', highlight: true },
                    { l: 'Δ vs original', v: (deltaPct > 0 ? '+' : '') + deltaPct.toFixed(1) + ' pts', dim: !anyAdjusted },
                  ].map((c, i) => (
                    <div key={c.l} style={{ padding: '14px', textAlign: 'center', borderRight: i < 3 ? '1px solid ' + C.border : 'none' }}>
                      <p style={{ fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>{c.l}</p>
                      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '18px', color: c.highlight ? gpColor(newPct, target, C) : c.dim ? C.faint : (c.l === 'Δ vs original' ? (deltaPct >= 0 ? C.greenLight : C.red) : C.text) }}>{c.v}</p>
                    </div>
                  ))}
                </div>

                {/* Per-ingredient adjusters */}
                <div style={{ padding: '14px 20px' }}>
                  {simIngs.length === 0 ? (
                    <p style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>This costing has no ingredients to adjust.</p>
                  ) : simIngs.map((ing: any) => {
                    const adj = simAdjusts[ing.id] || 0;
                    return (
                      <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 70px 1fr 80px', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid ' + C.border }}>
                        <div>
                          <p style={{ fontSize: '13px', color: C.text }}>{ing.name}</p>
                          <p style={{ fontSize: '10px', color: C.faint }}>{ing.qty}{ing.unit} @ {sym}{(parseFloat(ing.price) || 0).toFixed(2)} → {sym}{ing.newPrice.toFixed(2)}</p>
                        </div>
                        <input type="number" value={adj} step="5"
                          onChange={e => setSimAdjusts(prev => ({ ...prev, [ing.id]: parseFloat(e.target.value) || 0 }))}
                          style={{ width: '100%', background: C.surface2, border: '1px solid ' + (adj !== 0 ? C.gold + '60' : C.border), color: adj !== 0 ? C.gold : C.text, fontSize: '12px', padding: '6px 8px', outline: 'none', borderRadius: '2px', textAlign: 'right' }} />
                        <input type="range" min={-50} max={100} step={5} value={adj}
                          onChange={e => setSimAdjusts(prev => ({ ...prev, [ing.id]: parseFloat(e.target.value) || 0 }))}
                          style={{ width: '100%' }} />
                        <p style={{ fontSize: '11px', color: adj > 0 ? C.red : adj < 0 ? C.greenLight : C.dim, textAlign: 'right', fontWeight: 600 }}>
                          {sym}{ing.newLine.toFixed(3)}
                          {adj !== 0 && <span style={{ display: 'block', fontSize: '9px', color: C.faint, fontWeight: 400 }}>{adj > 0 ? '+' : ''}{adj}%</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid ' + C.border, display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => setSimAdjusts({})} disabled={!anyAdjusted}
                    style={{ fontSize: '11px', color: anyAdjusted ? C.dim : C.faint, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 14px', cursor: anyAdjusted ? 'pointer' : 'not-allowed', borderRadius: '2px', opacity: anyAdjusted ? 1 : 0.5 }}>
                    Reset all
                  </button>
                  <button onClick={() => setShowSimulator(false)}
                    style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '9px 18px', cursor: 'pointer', borderRadius: '2px' }}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Single-recipe print modal */}
        {showRecipePrint && (
          <>
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #recipe-print, #recipe-print * { visibility: visible !important; }
                #recipe-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; background: white !important; color: #111 !important; }
                #recipe-print-controls { display: none !important; }
                @page { size: A4; margin: 14mm; }
              }
            `}</style>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px', overflow: 'auto' }}>
              <div style={{ width: '100%', maxWidth: '800px', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
                <div id="recipe-print-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: C.surface, border: '1px solid ' + C.border, borderBottom: 'none', borderRadius: '4px 4px 0 0' }}>
                  <p style={{ fontSize: '12px', color: C.faint }}>Recipe · A4 print preview</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => window.print()}
                      style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                      Print
                    </button>
                    <button onClick={() => setShowRecipePrint(false)}
                      style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                      Close
                    </button>
                  </div>
                </div>
                <div id="recipe-print" style={{ background: '#FFFFFF', color: '#111', padding: '32px 40px', overflow: 'auto', fontFamily: 'system-ui,sans-serif', borderRadius: '0 0 4px 4px' }}>
                  {recipePrintBody(sel)}
                  <div style={{ borderTop: '1px solid #DDD', paddingTop: '12px', marginTop: '20px', fontSize: '10px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{state.profile?.businessName?.trim() || 'Palate & Pen'} · Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span>Palatable</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── RECIPE LIST ────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? '20px 16px' : '32px', fontFamily: 'system-ui,sans-serif', color: C.text }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'start',
        gap: isMobile ? '12px' : 0,
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>Recipe Library</h1>
          <p style={{ fontSize: '12px', color: C.faint }}>{state.recipes.length} recipe{state.recipes.length !== 1 ? 's' : ''} saved</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={() => setShowRecipeBook(true)} disabled={state.recipes.length === 0}
            title={state.recipes.length === 0 ? 'No recipes to compile' : 'Compile every recipe into a printable book'}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: state.recipes.length === 0 ? C.faint : C.gold, background: state.recipes.length === 0 ? 'transparent' : C.gold + '12', border: '1px solid ' + (state.recipes.length === 0 ? C.border : C.gold + '40'), padding: '10px 16px', cursor: state.recipes.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: state.recipes.length === 0 ? 0.5 : 1 }}>
            🖨 Print Recipe Book
          </button>
          {flagAiSpecSheet && (
            <button onClick={() => { setShowScanSpec(true); setScanError(''); setScannedData(null); }}
              title="Scan a spec sheet with AI to import recipe + costing in one shot"
              style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '40', padding: '10px 16px', cursor: 'pointer', borderRadius: '2px' }}>
              ✨ Scan Spec Sheet
            </button>
          )}
          <button onClick={() => setShowAdd(true)}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>
            + Add Recipe
          </button>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipes..."
        style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '12px 14px', outline: 'none', fontFamily: 'system-ui,sans-serif', marginBottom: '16px', boxSizing: 'border-box' }} />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: '13px', color: C.faint }}>No recipes yet. Add your first one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: '8px' }}>
          {filtered.map((r: any) => {
            const costing = getLinkedCosting(r);
            // Card chips reflect the same effective Contains list as the detail view
            const cardComputed = computeFromBank(costing, state.ingredientsBank || []);
            const cardContains = Array.from(new Set<string>([
              ...Array.from(cardComputed.contains),
              ...(r.allergens?.contains || []),
            ]));
            return (
              <button key={r.id} onClick={() => { setSel(r); setEditMode(false); setAssigningCosting(false); }}
                style={{ textAlign: 'left', background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: 0, cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {r.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photoUrl} alt={r.title} style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block', borderBottom: '1px solid ' + C.border }} />
                )}
                <div style={{ padding: '20px' }}>
                <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '18px', color: C.text, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {r.locked && <span title="Locked" style={{ fontSize: '12px', color: C.gold }}>🔒</span>}
                  {r.title}
                </h3>
                {r.imported?.description && (
                  <p style={{ fontSize: '12px', color: C.faint, lineHeight: 1.5, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.imported.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: C.gold, background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', padding: '2px 8px', borderRadius: '2px' }}>{r.category || 'Other'}</span>
                  {costing && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: gpColor(costing.pct||0, costing.target||gpTarget, C), background: gpColor(costing.pct||0, costing.target||gpTarget, C) + '18', border: '0.5px solid ' + gpColor(costing.pct||0, costing.target||gpTarget, C) + '30', padding: '2px 8px', borderRadius: '2px' }}>
                      GP {(costing.pct||0).toFixed(1)}%
                    </span>
                  )}
                  {r.imported && <span style={{ fontSize: '10px', color: C.faint, background: C.surface2, border: '0.5px solid ' + C.border, padding: '2px 8px', borderRadius: '2px' }}>Imported</span>}
                  {(r.linkedNoteIds||[]).length > 0 && <span style={{ fontSize: '10px', color: C.faint, background: C.surface2, border: '0.5px solid ' + C.border, padding: '2px 8px', borderRadius: '2px' }}>{r.linkedNoteIds.length} note{r.linkedNoteIds.length > 1 ? 's' : ''}</span>}
                  {cardContains.map((k: string) => {
                    const a = ALLERGENS.find(x => x.key === k);
                    if (!a) return null;
                    return <span key={k} title={`Contains ${a.label}`} style={{ fontSize: '9px', fontWeight: 700, color: C.red, background: C.red + '12', border: '0.5px solid ' + C.red + '30', padding: '2px 6px', borderRadius: '2px' }}>{a.short}</span>;
                  })}
                </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '520px', maxHeight: '92vh', overflow: 'auto', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
              <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>Add Recipe</h3>
              <button onClick={resetAddForm} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Import from URL or file */}
            {flagAiRecipeImport && (
            <div style={{ padding: '16px 20px', background: C.gold + '08', borderBottom: '1px solid ' + C.border }}>
              <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.gold, display: 'block', marginBottom: '8px' }}>
                Import with AI <span style={{ fontWeight: 400, color: C.faint, textTransform: 'none', letterSpacing: 'normal' }}>— Claude reads a URL or file and fills the fields below</span>
              </label>
              {/* URL row */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  type="url"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && importUrl.trim() && !importing) importRecipe(); }}
                  placeholder="https://www.bbcgoodfood.com/recipes/..."
                  style={{ ...inp, flex: 1 }}
                  disabled={importing}
                />
                <button onClick={() => importRecipe()} disabled={!importUrl.trim() || importing}
                  style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '0 16px', cursor: importing || !importUrl.trim() ? 'default' : 'pointer', borderRadius: '2px', opacity: importing || !importUrl.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                  {importing ? 'Reading…' : 'Import URL'}
                </button>
              </div>
              {/* File row */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', background: C.surface, border: '1px dashed ' + C.gold + '50',
                borderRadius: '2px', cursor: importing ? 'wait' : 'pointer',
                fontSize: '12px', color: C.dim,
              }}>
                <span style={{ fontSize: '14px' }}>📄</span>
                <span style={{ flex: 1 }}>{importing ? 'Reading file…' : 'Or upload a file — PDF, image (JPG/PNG/WebP), or text'}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.gold }}>Choose file</span>
                <input
                  type="file"
                  accept="application/pdf,image/*,text/*,.txt,.md,.csv"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) importRecipe({ file: f });
                  }}
                  disabled={importing}
                  style={{ display: 'none' }}
                />
              </label>
              {importError && (
                <p style={{ fontSize: '11px', color: C.red, marginTop: '8px' }}>{importError}</p>
              )}
              {importedData && !importError && (
                <p style={{ fontSize: '11px', color: C.greenLight, marginTop: '8px' }}>
                  ✓ Imported{importedData._meta?.source ? ' from ' + importedData._meta.source : ''} · {importedData.ingredients?.length || 0} ingredients · {importedData.method?.length || 0} steps{importedData.servings ? ' · serves ' + importedData.servings : ''}
                </p>
              )}
            </div>
            )}

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Beef Bourguignon" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '8px' }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {CATS.map(c => (
                    <button key={c} onClick={() => setNewCat(c)}
                      style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid ' + (newCat === c ? C.gold : C.border), color: newCat === c ? C.gold : C.dim, background: newCat === c ? C.gold + '10' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Photo (optional)</label>
                {newPhotoPreview ? (
                  <div style={{ position: 'relative', borderRadius: '3px', overflow: 'hidden', border: '1px solid ' + C.border }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newPhotoPreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.text, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 9px', borderRadius: '2px', cursor: 'pointer' }}>
                        Replace
                        <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0] || null; pickNewPhoto(f); e.target.value = ''; }} style={{ display: 'none' }} />
                      </label>
                      <button onClick={() => pickNewPhoto(null)}
                        style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.text, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 9px', cursor: 'pointer', borderRadius: '2px' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '20px', background: C.surface2, border: '1px dashed ' + C.border, borderRadius: '3px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '12px', color: C.dim }}>📷 Add a photo</span>
                    <span style={{ fontSize: '10px', color: C.faint }}>JPEG or PNG, auto-resized after save</span>
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0] || null; pickNewPhoto(f); e.target.value = ''; }} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Chef&apos;s Notes</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Your thoughts, variations..." rows={3} style={{ ...inp, resize: 'none' }} />
              </div>
              {importedData && (importedData.ingredients?.length > 0 || importedData.method?.length > 0) && (
                <div style={{ background: C.surface2, border: '0.5px dashed ' + C.border, padding: '12px', borderRadius: '3px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>Imported preview</p>
                  {importedData.ingredients?.length > 0 && (
                    <p style={{ fontSize: '11px', color: C.dim, marginBottom: '4px' }}><strong style={{ color: C.text }}>Ingredients:</strong> {importedData.ingredients.slice(0, 3).join(', ')}{importedData.ingredients.length > 3 ? ', +' + (importedData.ingredients.length - 3) + ' more' : ''}</p>
                  )}
                  {importedData.method?.length > 0 && (
                    <p style={{ fontSize: '11px', color: C.dim }}><strong style={{ color: C.text }}>Method:</strong> {importedData.method.length} step{importedData.method.length === 1 ? '' : 's'} captured</p>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderTop: '1px solid ' + C.border }}>
              <button onClick={resetAddForm} style={{ flex: 1, fontSize: '12px', color: C.dim, background: C.surface2, border: '1px solid ' + C.border, padding: '10px', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
              <button onClick={addRecipe} disabled={!newTitle.trim()}
                style={{ flex: 1, fontSize: '12px', fontWeight: 700, background: C.gold, color: C.bg, border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '2px', opacity: !newTitle.trim() ? 0.4 : 1 }}>
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spec sheet scan modal — upload → AI extracts → preview → commit recipe+costing */}
      {showScanSpec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '560px', maxHeight: '92vh', overflow: 'auto', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
              <div>
                <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>Scan Spec Sheet</h3>
                <p style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>AI reads a printed spec sheet and creates the recipe + costing in one shot</p>
              </div>
              <button onClick={() => { setShowScanSpec(false); setScannedData(null); setScanError(''); }}
                style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            {!scannedData && (
              <div style={{ padding: '20px' }}>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '32px 16px',
                  background: C.surface2, border: '1px dashed ' + C.gold + '50', borderRadius: '3px',
                  cursor: scanning ? 'wait' : 'pointer',
                }}>
                  <span style={{ fontSize: '24px' }}>✨</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{scanning ? 'Scanning…' : 'Upload spec sheet'}</span>
                  <span style={{ fontSize: '11px', color: C.faint, textAlign: 'center', maxWidth: '320px' }}>
                    PDF or image (JPG / PNG / WebP). Claude reads title, portions, sell price, ingredients with cost, allergens, and nutrition.
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) scanSpecSheet(f); }}
                    disabled={scanning}
                    style={{ display: 'none' }}
                  />
                </label>
                {scanError && (
                  <p style={{ fontSize: '11px', color: C.red, marginTop: '10px' }}>⚠ {scanError}</p>
                )}
                <p style={{ fontSize: '11px', color: C.faint, marginTop: '14px', lineHeight: 1.6 }}>
                  Tip: works best on printed spec sheets with clear ingredient quantities, prices, and a sell price. Missing fields are left blank — you can fill them in after.
                </p>
              </div>
            )}

            {scannedData && (() => {
              const data = scannedData;
              const ingCount = Array.isArray(data.ingredients) ? data.ingredients.length : 0;
              const methodCount = Array.isArray(data.method) ? data.method.length : 0;
              const allergens = data.allergens || {};
              const containsLen = Array.isArray(allergens.contains) ? allergens.contains.length : 0;
              const mayLen = Array.isArray(allergens.mayContain) ? allergens.mayContain.length : 0;
              const portions = parseInt(data.portions) || 1;
              const sell = parseFloat(data.sellPrice) || 0;
              const totalCost = Array.isArray(data.ingredients)
                ? data.ingredients.reduce((a: number, i: any) => {
                    const q = parseFloat(i.qty) || 0;
                    const p = parseFloat(i.price) || 0;
                    const u = (i.unit || '').toString();
                    let line = q * p;
                    if (u === 'g' || u === 'ml') line = (q / 1000) * p;
                    return a + line;
                  }, 0)
                : 0;
              const costPer = totalCost / portions;
              const pct = sell > 0 ? ((sell - costPer) / sell) * 100 : 0;
              const row: any = { fontSize: '12px', color: C.dim, padding: '4px 0', display: 'flex', justifyContent: 'space-between', gap: '8px' };
              return (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: C.gold + '10', border: '1px solid ' + C.gold + '40', borderRadius: '3px', padding: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, marginBottom: '6px' }}>Extracted</p>
                    <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>{data.title || 'Untitled dish'}</p>
                    <p style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{data.category || 'Main'} · {portions} portion{portions === 1 ? '' : 's'}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>Costing preview</p>
                    <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px', padding: '10px 12px' }}>
                      <div style={row}><span>Sell price</span><span style={{ color: C.text, fontWeight: 600 }}>{sym}{sell.toFixed(2)}</span></div>
                      <div style={row}><span>Cost / cover</span><span style={{ color: C.text }}>{sym}{costPer.toFixed(2)}</span></div>
                      <div style={row}><span>GP %</span><span style={{ color: pct >= gpTarget ? C.greenLight : C.red, fontWeight: 700 }}>{sell > 0 ? pct.toFixed(1) + '%' : '—'}</span></div>
                      <div style={row}><span>Ingredients</span><span style={{ color: C.text }}>{ingCount}</span></div>
                      <div style={row}><span>Method steps</span><span style={{ color: C.text }}>{methodCount}</span></div>
                      <div style={row}><span>Allergens</span><span style={{ color: C.text }}>{containsLen} contains · {mayLen} may contain</span></div>
                    </div>
                  </div>

                  {ingCount > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>Ingredients (first 8)</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {data.ingredients.slice(0, 8).map((i: any, idx: number) => (
                          <p key={idx} style={{ fontSize: '11px', color: C.dim }}>
                            <span style={{ color: C.text, fontWeight: 600 }}>{i.qty}{i.unit}</span> {i.name}{i.price ? <span style={{ color: C.faint }}> · {sym}{Number(i.price).toFixed(2)}/{i.unit}</span> : null}
                          </p>
                        ))}
                        {ingCount > 8 && <p style={{ fontSize: '10px', color: C.faint }}>+ {ingCount - 8} more</p>}
                      </div>
                    </div>
                  )}

                  <p style={{ fontSize: '11px', color: C.faint, lineHeight: 1.6 }}>
                    Save creates a recipe + costing pair, links them, and adds any new ingredient names to your Bank (no price overwrite). You can fine-tune everything in the recipe afterwards.
                  </p>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px', padding: '14px 20px', borderTop: '1px solid ' + C.border, justifyContent: 'flex-end' }}>
              {scannedData && (
                <button onClick={() => { setScannedData(null); setScanError(''); }}
                  style={{ fontSize: '12px', color: C.dim, background: C.surface2, border: '1px solid ' + C.border, padding: '10px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                  Scan a different sheet
                </button>
              )}
              <button onClick={() => { setShowScanSpec(false); setScannedData(null); setScanError(''); }}
                style={{ fontSize: '12px', color: C.dim, background: C.surface2, border: '1px solid ' + C.border, padding: '10px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                Cancel
              </button>
              {scannedData && (
                <button onClick={commitScannedSpec}
                  style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>
                  Save Recipe + Costing
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recipe book print modal — compiles every recipe into one document,
          ordered by CATS index then alphabetical within category. Title page +
          contents + one A4 page per recipe (page-break-after via CSS). */}
      {showRecipeBook && (() => {
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const sorted = [...state.recipes].sort((a: any, b: any) => {
          const ca = CATS.indexOf(a.category || 'Other');
          const cb = CATS.indexOf(b.category || 'Other');
          const ia = ca === -1 ? CATS.length : ca;
          const ib = cb === -1 ? CATS.length : cb;
          if (ia !== ib) return ia - ib;
          return (a.title || '').localeCompare(b.title || '');
        });
        const byCategory: Record<string, any[]> = {};
        for (const r of sorted) {
          const c = r.category || 'Other';
          if (!byCategory[c]) byCategory[c] = [];
          byCategory[c].push(r);
        }
        return (
          <>
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #recipe-book-print, #recipe-book-print * { visibility: visible !important; }
                #recipe-book-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; background: white !important; color: #111 !important; }
                #recipe-book-controls { display: none !important; }
                .book-page { page-break-after: always; break-after: page; padding: 22mm 16mm 8mm 16mm !important; box-sizing: border-box; }
                .book-page:last-child { page-break-after: auto; break-after: auto; }
                /* @page bottom margin reserves room for the native page-number footer.
                   Chrome/Edge render @bottom-* boxes; Safari supports basic content;
                   Firefox ignores them (graceful — the rest of the book still prints fine). */
                @page {
                  size: A4;
                  margin: 0 0 14mm 0;
                  @bottom-right {
                    content: "Page " counter(page) " of " counter(pages);
                    font-family: system-ui, sans-serif;
                    font-size: 9pt;
                    color: #888;
                    padding: 0 16mm 0 0;
                  }
                }
                /* Title page is unnumbered (and the wordmark is the cover anyway) */
                @page :first {
                  @bottom-right { content: ""; }
                }
              }
            `}</style>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px', overflow: 'auto' }}>
              <div style={{ width: '100%', maxWidth: '840px', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
                <div id="recipe-book-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: C.surface, border: '1px solid ' + C.border, borderBottom: 'none', borderRadius: '4px 4px 0 0' }}>
                  <p style={{ fontSize: '12px', color: C.faint }}>Recipe book · {sorted.length} recipe{sorted.length === 1 ? '' : 's'} · A4 print preview</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => window.print()}
                      style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                      Print
                    </button>
                    <button onClick={() => setShowRecipeBook(false)}
                      style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                      Close
                    </button>
                  </div>
                </div>
                <div id="recipe-book-print" style={{ background: '#FFFFFF', color: '#111', overflow: 'auto', fontFamily: 'system-ui,sans-serif', borderRadius: '0 0 4px 4px' }}>
                  {/* Title page — business name (when set) is the primary identifier;
                      Palatable wordmark sits as the platform credit above. */}
                  {(() => {
                    const biz = (state.profile?.businessName || '').trim();
                    const logo = state.profile?.logoUrl as string | undefined;
                    return (
                      <div className="book-page" style={{ minHeight: '780px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 40px', textAlign: 'center' }}>
                        {/* Palatable wordmark stays primary at the top of the cover */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: (logo || biz) ? '32px' : '24px' }}>
                          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: '#111', fontSize: '48px' }}>P</span>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C8960A', marginBottom: '16px' }}></div>
                          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: '#111', fontSize: '48px', letterSpacing: '8px' }}>ALATABLE</span>
                        </div>
                        {/* User's business logo — secondary, sits below the platform wordmark */}
                        {logo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo} alt={biz || 'Logo'} style={{ maxHeight: '90px', maxWidth: '50%', objectFit: 'contain', marginBottom: biz ? '18px' : '12px' }} />
                        )}
                        {biz && (
                          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '44px', color: '#111', marginBottom: '8px', lineHeight: 1.1 }}>{biz}</h1>
                        )}
                        <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: biz ? '26px' : '36px', color: biz ? '#555' : '#111', marginBottom: '12px', fontStyle: biz ? 'italic' : 'normal' }}>Recipe Book</h2>
                        {(state.profile?.name || state.profile?.location) && (
                          <p style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>
                            {state.profile?.name}{state.profile?.name && state.profile?.location ? ' · ' : ''}{state.profile?.location}
                          </p>
                        )}
                        <p style={{ fontSize: '12px', color: '#888', marginTop: '24px' }}>Compiled {today} · {sorted.length} recipe{sorted.length === 1 ? '' : 's'}</p>
                      </div>
                    );
                  })()}
                  {/* Contents */}
                  <div className="book-page" style={{ padding: '40px', minHeight: '780px' }}>
                    <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '30px', color: '#111', marginBottom: '20px', borderBottom: '1px solid #DDD', paddingBottom: '10px' }}>Contents</h2>
                    {Object.entries(byCategory).map(([cat, list]) => (
                      <section key={cat} style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>{cat}</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {list.map((r: any) => (
                            <li key={r.id} style={{ fontSize: '13px', color: '#222', padding: '5px 0', borderBottom: '0.5px dotted #DDD' }}>{r.title || 'Untitled recipe'}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                  {/* Recipe pages */}
                  {sorted.map((r: any) => (
                    <div key={r.id} className="book-page" style={{ padding: '32px 40px' }}>
                      {recipePrintBody(r)}
                      <div style={{ borderTop: '1px solid #DDD', paddingTop: '12px', marginTop: '20px', fontSize: '10px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{r.category || 'Other'}</span>
                        <span>{state.profile?.businessName?.trim() ? state.profile.businessName.trim() + ' · ' : ''}Recipe Book</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
