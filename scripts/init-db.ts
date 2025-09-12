#!/usr/bin/env ts-node

/**
 * Database initialization script
 * This script initializes the database with required tables and data
 */

import { initializeDatabase, closePool } from '../app/utils/database.js';

async function main() {
  console.log('Starting database initialization...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await closePool();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await closePool();
  process.exit(1);
});

main();
