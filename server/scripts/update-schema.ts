import { pool, db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';

/**
 * Script to update existing users' isActive status to maintain admin access
 */
async function main() {
  console.log('Starting schema update script...');
  
  // Make sure any existing admin users remain active
  try {
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    console.log(`Found ${adminUsers.length} admin users`);
    
    for (const user of adminUsers) {
      console.log(`Ensuring admin user ${user.email} (ID: ${user.id}) is active...`);
      await db.update(users)
        .set({ isActive: true })
        .where(eq(users.id, user.id));
    }
    
    console.log('Admin users updated successfully');
  } catch (error) {
    console.error('Error updating admin users:', error);
  }
  
  // Close the database connection
  await pool.end();
  console.log('Database connection closed. Script completed.');
}

main()
  .then(() => console.log('Schema update completed successfully'))
  .catch((err) => console.error('Error in schema update:', err));