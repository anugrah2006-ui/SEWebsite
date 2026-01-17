const mysql = require('mysql2/promise');

async function main() {
  console.log('Initializing database schema (CommonJS)...');

  try {
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

    await connection.execute(createTableQuery);
    console.log('✅ Table site_content created or already exists.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error('❌ MySQL2 module not found. Please ensure npm install has run.');
    } else {
        console.error('❌ Error creating table:', error);
    }
    process.exit(1);
  }
}

main();
