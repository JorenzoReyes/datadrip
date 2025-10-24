import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '../../../utils/database';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as {
      user_id: number;
      currentPassword: string;
      newPassword: string;
    };

    const { user_id, currentPassword, newPassword } = body;

    if (!user_id || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user from database
    const user = await queryOne<{
      user_id: number;
      password_hash: string;
      email: string;
    }>('SELECT user_id, password_hash, email FROM users WHERE user_id = $1', [user_id]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newPasswordHash, user_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
