/* eslint-disable no-console */
/*
 * stamp-applied-2026-05-16.js — adds the "-- Applied: 2026-05-16 ..."
 * breadcrumb line to every migration file that landed in production
 * today. One-off run after Jack confirmed all 8 ran in the SQL editor.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS = [
  '20260516_v2_intelligence_events.sql',
  '20260516_v2_intelligence_event_emitters.sql',
  '20260516_v2_feature_flags.sql',
  '20260516_v2_anthropic_usage.sql',
  '20260516_v2_ai_cache.sql',
  '20260516_v2_safety_tables.sql',
  '20260516_v2_accounts_safety_flag.sql',
  '20260516_v2_safety_event_emitters.sql',
];

const STAMP = '-- Applied: 2026-05-16 (manual run via Supabase SQL editor)';

for (const filename of MIGRATIONS) {
  const filepath = path.join(ROOT, 'supabase', 'migrations', filename);
  if (!fs.existsSync(filepath)) {
    console.log('skip (missing)', filename);
    continue;
  }
  const body = fs.readFileSync(filepath, 'utf8');
  if (body.includes('-- Applied:')) {
    console.log('skip (already stamped)', filename);
    continue;
  }
  const lines = body.split('\n');
  let insertAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('-- Date:')) {
      insertAt = i + 1;
      break;
    }
  }
  if (insertAt === -1) {
    console.log('skip (no -- Date: header)', filename);
    continue;
  }
  lines.splice(insertAt, 0, STAMP);
  fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
  console.log('stamped', filename);
}

console.log('\ndone');
