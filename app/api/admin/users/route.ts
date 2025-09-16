import { NextResponse } from 'next/server';
import { getAllUsers, User as DbUser } from '../../../utils/database';

export async function GET() {
  try {
    const users: DbUser[] = await getAllUsers();
    // Map DB users to frontend User shape expected by admin UI
    const mapped = users.map((u) => ({
      id: String(u.user_id),
      firstName: u.fname,
      lastName: u.lname,
      email: u.email,
      username: u.username,
      role: 'user',
      status: 'active',
      createdAt: u.created_at,
      updatedAt: u.created_at,
      lastLoginAt: undefined,
      createdBy: 'system'
    }));
    return NextResponse.json({ users: mapped });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}


