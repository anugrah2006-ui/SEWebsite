import db from '../lib/db.ts';

async function main() {
  console.log('Initializing database schema...');

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS site_content (
      section_key VARCHAR(255) NOT NULL PRIMARY KEY,
      content JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.execute(createTableQuery);
    console.log('✅ Table site_content created or already exists.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

main();
