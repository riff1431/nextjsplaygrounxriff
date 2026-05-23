const postgres = require('postgres');

async function run() {
  console.log('Connecting to PostgreSQL on 127.0.0.1:5432...');
  const sql = postgres('postgresql://postgres:postgres@127.0.0.1:5432/postgres');
  
  try {
    await sql`ALTER TABLE truth_dare_requests ADD COLUMN IF NOT EXISTS response_media_url TEXT;`;
    console.log('Successfully added response_media_url column to truth_dare_requests!');
    
    // Verify the columns
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'truth_dare_requests';
    `;
    console.log('Current columns in truth_dare_requests:', columns.map(c => c.column_name));
  } catch (err) {
    console.error('Failed to alter table:', err.message);
  } finally {
    await sql.end();
  }
}

run();
