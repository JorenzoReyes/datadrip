import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmailOrUsername, getUserRoles, getUserPermissions, query } from '../../../utils/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailOrUsername, password } = body;

    // Validate required fields
    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      );
    }

    // Find user by email or username
    const user = await findUserByEmailOrUsername(emailOrUsername);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      );
    }

    // Check password (in production, this should use proper password hashing)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      );
    }

    // Update last_login_at on successful login
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);

    // Return user data (excluding password) + roles/permissions
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    const roles = await getUserRoles(user.user_id);
    const permissions = await getUserPermissions(user.user_id);
    return NextResponse.json(
      { 
        message: 'Login successful',
        user: { ...userWithoutPassword, roles, permissions }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
