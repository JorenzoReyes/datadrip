import { NextRequest, NextResponse } from 'next/server';
import {
  createUser,
  emailExists,
  usernameExists,
  queryOne,
  query,
  User,
} from '../../../utils/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, fname, lname, email, password } = body || {};

    if (!username || !fname || !lname || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Uniqueness checks
    const [emailInUse, usernameInUse] = await Promise.all([
      emailExists(email),
      usernameExists(username),
    ]);

    if (emailInUse) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    if (usernameInUse) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Create user
    const newUser = await createUser({ username, fname, lname, email, password });
    if (!newUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Assign default role: business_owner
    const role = await queryOne<{ role_id: number }>(
      'SELECT role_id FROM roles WHERE name = $1',
      ['business_owner']
    );
    if (role?.role_id) {
      await query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2
         )`,
        [newUser.user_id, role.role_id]
      );
    }

    // Ensure business_owner has permissions including products and insights
    const neededPerms = ['view_products', 'view_insights'];
    for (const p of neededPerms) {
      await query(
        `INSERT INTO role_permissions (permission_id, role_id, permission)
         SELECT pe.permission_id, r.role_id, pe.name
         FROM permissions pe, roles r
         WHERE pe.name = $1 AND r.name = 'business_owner'
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions rp WHERE rp.permission_id = pe.permission_id AND rp.role_id = r.role_id
           );`,
        [p]
      );
    }

    // Omit password in response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser as unknown as User & { password: string };

    return NextResponse.json({ success: true, user: userWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}


