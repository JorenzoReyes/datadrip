import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, updateUser as dbUpdateUser, deleteUser as dbDeleteUser } from '../../../../utils/database';

type DbUserRow = {
  user_id: number;
  username: string;
  fname: string;
  lname: string;
  email: string;
  status: string;
  created_at: string;
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json() as {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    role?: 'user'|'admin'|'system_admin';
    status?: 'active'|'inactive'|'pending';
  };

  const existing = await queryOne<DbUserRow>('SELECT * FROM users WHERE user_id = $1', [userId]);
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Uniqueness checks
  if (body.email || body.username) {
    const conflict = await queryOne<{ user_id: number }>(
      'SELECT user_id FROM users WHERE (email = $1 OR username = $2) AND user_id <> $3',
      [body.email ?? existing.email, body.username ?? existing.username, userId]
    );
    if (conflict) return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 });
  }

  // Patch core fields
  const patch: Record<string, unknown> = {};
  if (body.firstName !== undefined) patch.fname = body.firstName;
  if (body.lastName !== undefined) patch.lname = body.lastName;
  if (body.email !== undefined) patch.email = body.email;
  if (body.username !== undefined) patch.username = body.username;

  if (Object.keys(patch).length) {
    await dbUpdateUser(userId, patch);
  }

  // Role update
  if (body.role) {
    await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    const r = await queryOne<{ role_id: number }>('SELECT role_id FROM roles WHERE name = $1', [body.role]);
    if (r?.role_id) {
      await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, r.role_id]);
    }
  }

  // Status update
  if (body.status) {
    await query('UPDATE users SET status = $1 WHERE user_id = $2', [body.status, userId]);
  }

  const updated = await queryOne<DbUserRow>(
    `SELECT u.user_id, u.username, u.fname, u.lname, u.email, u.status, u.created_at
     FROM users u WHERE u.user_id = $1`,
    [userId]
  );
  if (!updated) return NextResponse.json({ error: 'Failed to load updated user' }, { status: 500 });

  const roles = await query<{ name: string }>(
    `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id=r.role_id WHERE ur.user_id=$1`,
    [userId]
  );

  return NextResponse.json({
    success: true,
    user: {
      id: String(updated.user_id),
      firstName: updated.fname,
      lastName: updated.lname,
      email: updated.email,
      username: updated.username,
      role: roles[0]?.name ?? 'user',
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.created_at,
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const existing = await queryOne('SELECT 1 FROM users WHERE user_id=$1', [userId]);
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const ok = await dbDeleteUser(userId);
  if (!ok) return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });

  return NextResponse.json({ success: true });
}