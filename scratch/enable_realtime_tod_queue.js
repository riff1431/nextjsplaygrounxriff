const postgres = require('postgres');

async function runOnPort(port) {
  const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  console.log(`Connecting to PostgreSQL on port ${port}...`);
  const sql = postgres(connectionString);
  
  try {
    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_publication_tables 
              WHERE pubname = 'supabase_realtime' AND tablename = 'truth_dare_queue'
          ) THEN
              ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_dare_queue;
          END IF;
      END $$;
    `;
    console.log(`Successfully enabled supabase_realtime for truth_dare_queue on port ${port}!`);
    
    // Verify
    const res = await sql`
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'truth_dare_queue';
    `;
    console.log(`Verification on port ${port}:`, res.length > 0 ? "ENABLED ✅" : "NOT ENABLED ❌");
  } catch (err) {
    console.log(`Could not enable on port ${port}:`, err.message);
  } finally {
    await sql.end();
  }
}

async function run() {
  await runOnPort(54322); // Supabase local port
  await runOnPort(5432);  // Standard Postgres port
}

run();
