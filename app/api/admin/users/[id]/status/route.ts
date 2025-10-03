import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '../../../../../utils/database';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = Number(params.id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { status } = await req.json() as { status: 'active'|'inactive'|'pending' };
  if (!['active','inactive','pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const existing = await queryOne('SELECT 1 FROM users WHERE user_id=$1', [userId]);
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await query('UPDATE users SET status=$1 WHERE user_id=$2', [status, userId]);
  return NextResponse.json({ success: true, status });
}
