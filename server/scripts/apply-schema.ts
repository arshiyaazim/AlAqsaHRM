import { pool, db } from '../db';
import { eq, sql } from 'drizzle-orm';
import { users } from '../../shared/schema';

/**
 * Script to apply schema changes without using the interactive Drizzle CLI
 */
async function main() {
  console.log('Starting schema application...');
  
  try {
    // Alter the users table to set the default for isActive to false
    await db.execute(
      sql`ALTER TABLE users ALTER COLUMN isactive SET DEFAULT false;`
    );
    console.log('Updated isActive default value to false');
    
    console.log('Schema changes applied successfully');
  } catch (error) {
    console.error('Error applying schema changes:', error);
  }
  
  // Close the database connection
  await pool.end();
  console.log('Database connection closed. Script completed.');
}

main()
  .then(() => console.log('Schema update completed successfully'))
  .catch((err) => console.error('Error in schema update:', err));