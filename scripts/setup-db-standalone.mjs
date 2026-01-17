import mysql from 'mysql2/promise';

async function main() {
  console.log('Initializing database schema (Standalone)...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog_jobs_db',
  });

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS site_content (
      section_key VARCHAR(255) NOT NULL PRIMARY KEY,
      content JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await connection.execute(createTableQuery);
    console.log('✅ Table site_content created or already exists.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

main();
