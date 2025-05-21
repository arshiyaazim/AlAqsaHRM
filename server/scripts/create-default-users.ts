import { db } from '../db';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';

// Access environment variables directly

const SALT_ROUNDS = 10;

// Default users from environment
const defaultUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: process.env.ADMIN_ROLE || 'admin',
    employeeId: 'ADMIN01',
    isActive: true
  },
  {
    firstName: 'HR',
    lastName: 'Manager',
    email: process.env.HR_EMAIL || 'hr@example.com',
    password: process.env.HR_PASSWORD || 'hr1234',
    role: process.env.HR_ROLE || 'hr',
    employeeId: 'HR002',
    isActive: true
  },
  {
    firstName: 'View',
    lastName: 'Only',
    email: process.env.VIEWER_EMAIL || 'viewer@example.com',
    password: process.env.VIEWER_PASSWORD || 'view789',
    role: process.env.VIEWER_ROLE || 'viewer',
    employeeId: 'VIEW003',
    isActive: true
  }
];

async function createDefaultUsers() {
  try {
    console.log('Starting to create default users...');
    
    for (const user of defaultUsers) {
      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(cb => cb.eq(users.email, user.email));
      
      if (existingUser) {
        console.log(`User with email ${user.email} already exists. Skipping.`);
        continue;
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      
      // Create user
      const fullName = `${user.firstName} ${user.lastName}`;
      const [newUser] = await db.insert(users).values({
        firstName: user.firstName,
        lastName: user.lastName,
        fullName,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        employeeId: user.employeeId,
        isActive: user.isActive,
        permissions: {}
      }).returning();
      
      console.log(`Created user: ${newUser.fullName} (${newUser.email}) with role: ${newUser.role}`);
    }
    
    console.log('Default users setup complete!');
  } catch (error) {
    console.error('Error creating default users:', error);
  } finally {
    // Close database connection
    await db.end();
    process.exit(0);
  }
}

// Run the function
createDefaultUsers();