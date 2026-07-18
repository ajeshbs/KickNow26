import { NextRequest, NextResponse } from 'next/server';
import { getStandings } from '@/lib/football-data';
import { getCompetition } from '@/lib/competitions';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!getCompetition(code)) {
    return NextResponse.json({ error: 'Unknown competition' }, { status: 400 });
  }
  try {
    return NextResponse.json({ standings: await getStandings(code.toUpperCase()) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
