import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    const { error } = await supabase.from('waitlist').insert({ email, created_at: new Date().toISOString() });
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You are already on the list' }, { status: 400 });
      }
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Waitlist error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}