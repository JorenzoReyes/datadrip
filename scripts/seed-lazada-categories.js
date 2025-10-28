// Seed DB with Lazada category tree mapped to 3-level structure
// - category = level 1
// - subcategory = level 2
// - product_type = levels 3..5 joined with " > "

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function getPool() {
  const attempts = [];
  if (process.env.DATABASE_URL) attempts.push(process.env.DATABASE_URL);
  attempts.push('postgres://postgres:postgres@localhost:5433/datadrip');
  attempts.push('postgres://postgres:postgres@localhost:5432/datadrip');

  let lastErr;
  for (const url of attempts) {
    try {
      const pool = new Pool({ connectionString: url });
      await pool.query('SELECT 1');
      console.log(`✅ Connected: ${url}`);
      return pool;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('No database connections succeeded');
}

function readLazadaTree() {
  const filePath = path.join(process.cwd(), 'app', 'data', 'lazadaCategoryTree.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('lazadaCategoryTree.json not found. Run fetch script first.');
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  return json.data || [];
}

function collectLeafPaths(nodes, prefix = [], acc = []) {
  for (const n of nodes || []) {
    const next = [...prefix, (n.name || '').trim()].filter(Boolean);
    if (!n.children || n.children.length === 0) {
      acc.push(next);
    } else {
      collectLeafPaths(n.children, next, acc);
    }
  }
  return acc;
}

function buildTuplesFromPaths(paths) {
  const tuples = new Map();
  for (const names of paths) {
    const [l1, l2, ...rest] = names;
    const category = l1 || 'Uncategorized';
    const subcategory = l2 || 'General';
    const product_type = rest.length ? rest.join(' > ') : 'Standard';
    const key = `${category}||${subcategory}||${product_type}`;
    if (!tuples.has(key)) tuples.set(key, { category, subcategory, product_type });
  }
  return Array.from(tuples.values());
}

async function seed() {
  console.log('🌱 Seeding Lazada categories → 3-level structure...');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure required taxonomy tables exist (lightweight, idempotent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        subcategory_id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(category_id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (category_id, name)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_types (
        product_type_id SERIAL PRIMARY KEY,
        subcategory_id INTEGER REFERENCES subcategories(subcategory_id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        attributes JSONB,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (subcategory_id, name)
      );
    `);

    const tree = readLazadaTree();
    const paths = collectLeafPaths(tree);
    const tuples = buildTuplesFromPaths(paths);

    // 1) Upsert categories
    const catNames = Array.from(new Set(tuples.map(t => t.category)));
    for (let i = 0; i < catNames.length; i++) {
      await client.query(
        `INSERT INTO categories (name, display_order, is_active)
         VALUES ($1::varchar, $2::int, true)
         ON CONFLICT (name) DO NOTHING`,
        [catNames[i], i + 1]
      );
    }

    const { rows: cats } = await client.query(
      `SELECT category_id, name FROM categories`
    );
    const catIdByName = new Map(cats.map(r => [r.name, r.category_id]));

    // 2) Upsert subcategories
    const subKeys = new Set();
    for (const t of tuples) {
      const cid = catIdByName.get(t.category);
      if (!cid) continue;
      const skey = `${cid}||${t.subcategory}`;
      if (subKeys.has(skey)) continue;
      subKeys.add(skey);
      await client.query(
        `INSERT INTO subcategories (category_id, name, is_active)
         VALUES ($1::int, $2::varchar, true)
         ON CONFLICT (category_id, name) DO NOTHING`,
        [cid, t.subcategory]
      );
    }

    const { rows: subs } = await client.query(
      `SELECT s.subcategory_id, s.name, c.name AS category_name
         FROM subcategories s
         JOIN categories c ON c.category_id = s.category_id`
    );
    const subIdByCatSub = new Map(subs.map(r => [`${r.category_name}||${r.name}`, r.subcategory_id]));

    // 3) Upsert product types
    const ptKeys = new Set();
    let ptCount = 0;
    for (const t of tuples) {
      const sid = subIdByCatSub.get(`${t.category}||${t.subcategory}`);
      if (!sid) continue;
      const pkey = `${sid}||${t.product_type}`;
      if (ptKeys.has(pkey)) continue;
      ptKeys.add(pkey);
      await client.query(
        `INSERT INTO product_types (subcategory_id, name, is_active)
         VALUES ($1::int, $2::varchar, true)
         ON CONFLICT (subcategory_id, name) DO NOTHING`,
        [sid, t.product_type]
      );
      ptCount++;
    }

    await client.query('COMMIT');
    console.log(`✅ Seeded:\n- categories: ${catNames.length}\n- subcategories: ${subKeys.size}\n- product_types: ${ptKeys.size}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
