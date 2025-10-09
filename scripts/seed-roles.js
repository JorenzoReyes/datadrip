#!/usr/bin/env node

/**
 * Seed base roles and permissions into the database
 * Roles: business_owner, admin, system_admin
 * Permissions: create, read, update, deactivate, view_dashboard, view_products, view_insights
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

function checkDockerAvailability() {
  try { execSync('docker --version', { stdio: 'ignore' }); return true; } catch { return false; }
}

function checkDockerPostgresRunning() {
  try {
    const out = execSync('docker ps --filter "name=postgres" --format "{{.Names}}"', { encoding: 'utf8' });
    return out.includes('postgres') || out.includes('datadrip');
  } catch { return false; }
}

function getDatabaseConfig() {
  // Prefer a single DATABASE_URL (Railway/tunnel). Use SSL but allow self-signed.
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL environment variable');
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  // Otherwise check for Docker
  const isDocker = checkDockerAvailability() && checkDockerPostgresRunning();
  if (isDocker) {
    console.log('🐳 Using Docker PostgreSQL configuration');
    return { host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5432'), database: process.env.DB_NAME || 'datadrip', user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'postgres', ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false };
  }
  console.log('💻 Using local PostgreSQL configuration');
  return { host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5432'), database: process.env.DB_NAME || 'datadrip', user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'password', ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false };
}

async function seedDirect() {
  const pool = new Pool(getDatabaseConfig());
  const rolesSql = `
    INSERT INTO roles (name, description) VALUES
      ('business_owner', 'Business owner with access to Insights and business modules'),
      ('admin', 'Administrator with elevated privileges'),
      ('system_admin', 'System administrator with full platform control')
    ON CONFLICT (name) DO NOTHING;`;

  const permsSql = `
    INSERT INTO permissions (name, description) VALUES
      ('create', 'Create resources'),
      ('read', 'Read resources'),
      ('update', 'Update resources'),
      ('deactivate', 'Deactivate resources'),
      ('view_dashboard', 'Access user dashboard'),
      ('view_settings', 'Access settings page'),
      ('view_products', 'Access products'),
      ('view_insights', 'Access insights module'),
      ('view_admin_dashboard', 'Access admin dashboard'),
      ('view_admin_manage_users', 'Access admin manage users'),
      ('view_admin_integrations', 'Access admin integrations'),
      ('view_admin_system_health', 'Access admin system health')
    ON CONFLICT (name) DO NOTHING;`;

  try {
    await pool.query(rolesSql);
    await pool.query(permsSql);
    // Seed ONLY demo users (idempotent by email)
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'demo_user','Demo','User','user@example.com','password123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='user@example.com');
    `);
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'demo_admin','Demo','Admin','admin@example.com','admin123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');
    `);
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'demo_system_admin','Demo','SystemAdmin','system.admin@example.com','system123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='system.admin@example.com');
    `);

    // user_roles mappings (idempotent)
    // Map demo users to roles
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='user@example.com' AND r.name='business_owner'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='admin@example.com' AND r.name='admin'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='system.admin@example.com' AND r.name='system_admin'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);

    // role_permissions mappings
    // business_owner permissions
    const boPerms = ['view_dashboard','view_settings','view_products','view_insights','read','update'];
    for (const p of boPerms) {
      await pool.query(`
        INSERT INTO role_permissions (permission_id, role_id, permission)
        SELECT pe.permission_id, r.role_id, pe.name
        FROM permissions pe, roles r
        WHERE pe.name=$1 AND r.name='business_owner'
          AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id
          );
      `, [p]);
    }

    // admin permissions
    const adminPerms = ['view_admin_dashboard','view_admin_manage_users','view_admin_integrations','view_admin_system_health','read','update','deactivate'];
    for (const p of adminPerms) {
      await pool.query(`
        INSERT INTO role_permissions (permission_id, role_id, permission)
        SELECT pe.permission_id, r.role_id, pe.name
        FROM permissions pe, roles r
        WHERE pe.name=$1 AND r.name='admin'
          AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id
          );
      `, [p]);
    }

    // system_admin gets everything (map all permissions)
    await pool.query(`
      INSERT INTO role_permissions (permission_id, role_id, permission)
      SELECT pe.permission_id, r.role_id, pe.name
      FROM permissions pe, roles r
      WHERE r.name='system_admin'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id
        );
    `);
    console.log('✅ Seeded roles and permissions via direct connection');
    await pool.end();
    return true;
  } catch (e) {
    console.error('Direct seed failed:', e.message);
    try { await pool.end(); } catch {}
    return false;
  }
}

function seedDocker() {
  console.log('🔄 Attempting to seed via Docker...');
  const rolesSql = `INSERT INTO roles (name, description) VALUES ('business_owner','Business owner with access to Insights and business modules'),('admin','Administrator with elevated privileges'),('system_admin','System administrator with full platform control') ON CONFLICT (name) DO NOTHING;`;
  const permsSql = `INSERT INTO permissions (name, description) VALUES ('create','Create resources'),('read','Read resources'),('update','Update resources'),('deactivate','Deactivate resources'),('view_dashboard','Access user dashboard'),('view_settings','Access settings page'),('view_products','Access products'),('view_insights','Access insights module'),('view_admin_dashboard','Access admin dashboard'),('view_admin_manage_users','Access admin manage users'),('view_admin_integrations','Access admin integrations'),('view_admin_system_health','Access admin system health') ON CONFLICT (name) DO NOTHING;`;
  try {
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${rolesSql}"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${permsSql}"`, { stdio: 'inherit' });
    // users (demo only)
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_user','Demo','User','user@example.com','password123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='user@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_admin','Demo','Admin','admin@example.com','admin123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_system_admin','Demo','SystemAdmin','system.admin@example.com','system123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='system.admin@example.com');"`, { stdio: 'inherit' });
    // user_roles (demo only)
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='user@example.com' AND r.name='business_owner' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='admin@example.com' AND r.name='admin' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='system.admin@example.com' AND r.name='system_admin' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    // role_permissions: business_owner
    const bo = ['view_dashboard','view_settings','view_products','view_insights','read','update'];
    for (const p of bo) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE pe.name='${p}' AND r.name='business_owner' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });
    }
    // admin
    const ad = ['view_admin_dashboard','view_admin_manage_users','view_admin_integrations','view_admin_system_health','read','update','deactivate'];
    for (const p of ad) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE pe.name='${p}' AND r.name='admin' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });
    }
    // system_admin: all perms
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE r.name='system_admin' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });
    console.log('✅ Seeded roles and permissions via Docker');
    return true;
  } catch (e) { console.error('Docker seed failed:', e.message); return false; }
}

async function main() {
  console.log('Seeding roles and permissions...');
  const ok = await seedDirect();
  if (ok) return;
  // If DATABASE_URL was intended and failed, do not attempt Docker fallback
  if (process.env.DATABASE_URL) {
    process.exitCode = 1;
    return;
  }
  const okDocker = seedDocker();
  if (!okDocker) process.exitCode = 1;
}

main();


