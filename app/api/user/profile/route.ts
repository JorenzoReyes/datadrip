import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, updateUser as dbUpdateUser } from '../../../utils/database';

type DbUserRow = {
  user_id: number;
  username: string;
  fname: string;
  lname: string;
  email: string;
  status: string;
  created_at: string;
};

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as {
      user_id?: number;
      fname?: string;
      lname?: string;
      email?: string;
      username?: string;
    };

    // Get user ID from the request (this should be set by middleware or passed in the request)
    // For now, we'll get it from the Authorization header or body
    const userId = body.user_id || req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const userIdNum = Number(userId);
    if (!Number.isFinite(userIdNum)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check if user exists
    const existing = await queryOne<DbUserRow>('SELECT * FROM users WHERE user_id = $1', [userIdNum]);
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Uniqueness checks for email and username
    if (body.email || body.username) {
      const conflict = await queryOne<{ user_id: number }>(
        'SELECT user_id FROM users WHERE (email = $1 OR username = $2) AND user_id <> $3',
        [body.email ?? existing.email, body.username ?? existing.username, userIdNum]
      );
      if (conflict) {
        return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 });
      }
    }

    // Prepare update fields
    const patch: Record<string, unknown> = {};
    if (body.fname !== undefined) patch.fname = body.fname;
    if (body.lname !== undefined) patch.lname = body.lname;
    if (body.email !== undefined) patch.email = body.email;
    if (body.username !== undefined) patch.username = body.username;

    // Update user in database
    if (Object.keys(patch).length > 0) {
      await dbUpdateUser(userIdNum, patch);
    }

    // Fetch updated user data
    const updated = await queryOne<DbUserRow>(
      `SELECT u.user_id, u.username, u.fname, u.lname, u.email, u.status, u.created_at
       FROM users u WHERE u.user_id = $1`,
      [userIdNum]
    );

    if (!updated) {
      return NextResponse.json({ error: 'Failed to load updated user' }, { status: 500 });
    }

    // Get user roles
    const roles = await query<{ name: string }>(
      `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id=r.role_id WHERE ur.user_id=$1`,
      [userIdNum]
    );

    return NextResponse.json({
      success: true,
      user: {
        user_id: updated.user_id,
        username: updated.username,
        fname: updated.fname,
        lname: updated.lname,
        email: updated.email,
        role: (roles[0]?.name === 'business_owner' ? 'user' : (roles[0]?.name ?? 'user')),
        roles: roles.map(r => r.name === 'business_owner' ? 'user' : r.name),
        status: updated.status,
        created_at: updated.created_at,
        isAuthenticated: true
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
