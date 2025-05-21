// This is a simple script to add default users to the database
// To run: node server/add-default-users.js

import bcrypt from 'bcryptjs';
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

const SALT_ROUNDS = 10;

// Default users configuration
const defaultUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    employeeId: 'ADMIN01'
  },
  {
    firstName: 'HR',
    lastName: 'Manager',
    email: 'hr@example.com',
    password: 'hr1234',
    role: 'hr',
    employeeId: 'HR002'
  },
  {
    firstName: 'View',
    lastName: 'Only',
    email: 'viewer@example.com',
    password: 'view789',
    role: 'viewer',
    employeeId: 'VIEW003'
  }
];

async function addUsers() {
  try {
    console.log('Starting to add default users...');
    
    for (const user of defaultUsers) {
      // Check if user already exists
      const checkResult = await pool.query(
        'SELECT * FROM "users" WHERE "email" = $1',
        [user.email]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`User ${user.email} already exists, skipping`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      
      // Generate full name
      const fullName = `${user.firstName} ${user.lastName}`;
      
      // Insert user
      const insertResult = await pool.query(
        `INSERT INTO "users" ("firstName", "lastName", "email", "password", "role", "employeeId", "fullName", "isActive", "permissions")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          user.firstName,
          user.lastName,
          user.email,
          hashedPassword,
          user.role,
          user.employeeId,
          fullName,
          true,
          '{}'
        ]
      );
      
      if (insertResult.rows.length > 0) {
        console.log(`Created user: ${user.email} with role: ${user.role}`);
      }
    }
    
    console.log('User creation complete!');
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
addUsers();