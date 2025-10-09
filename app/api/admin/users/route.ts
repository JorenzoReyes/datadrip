import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllUsers, 
  createUser, 
  User as DbUser, 
  CreateUserData as DbCreateUserData,
  query,
  queryOne,
  getUserRoles
} from '../../../utils/database';
import { CreateUserData } from '../../../types/user';

export async function GET() {
  try {
    const users: DbUser[] = await getAllUsers();
    // Map DB users to frontend User shape expected by admin UI, including actual role
    const mapped = await Promise.all(users.map(async (u) => {
      const roles = await getUserRoles(u.user_id);
      const uiRole = roles[0] === 'business_owner' ? 'user' : (roles[0] || 'user');
      return {
        id: String(u.user_id),
        firstName: u.fname,
        lastName: u.lname,
        email: u.email,
        username: u.username,
        role: uiRole,
        status: u.status || 'active',
        createdAt: u.created_at,
        updatedAt: u.created_at,
        lastLoginAt: u.last_login_at ?? null,
        createdBy: 'system'
      };
    }));
    return NextResponse.json({ users: mapped });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body: CreateUserData = await request.json();
    const { firstName, lastName, email, username, role, companyName } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !username || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Check if email or username already exists
    const existingUser = await queryOne<DbUser>(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already exists' }, 
        { status: 409 }
      );
    }

    // Create user in database with pending status
    const userData: DbCreateUserData = {
      username,
      fname: firstName,
      lname: lastName,
      email,
      password: 'temp123',
      status: 'pending' // New users start as pending
    };

    const newUser = await createUser(userData);
    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user' }, 
        { status: 500 }
      );
    }

    // Assign role to user (map UI 'user' -> DB 'business_owner')
    const dbRoleName = role === 'user' ? 'business_owner' : role;
    const roleResult = await queryOne<{ role_id: number }>(
      'SELECT role_id FROM roles WHERE name = $1',
      [dbRoleName]
    );

    if (roleResult?.role_id) {
      await query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [newUser.user_id, roleResult.role_id]
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(newUser.user_id),
        firstName: newUser.fname,
        lastName: newUser.lname,
        email: newUser.email,
        username: newUser.username,
        role: role,
        status: newUser.status,
        createdAt: newUser.created_at,
        updatedAt: newUser.created_at,
        createdBy: 'admin'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' }, 
      { status: 500 }
    );
  }
}


