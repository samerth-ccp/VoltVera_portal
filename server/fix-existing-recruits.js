// Script to fix existing admin-generated recruits
// Run this once to update existing data

import { db } from './db.js';
import { pendingRecruits, users } from '@shared/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function fixExistingRecruits() {
  console.log('🔧 Fixing existing admin-generated recruits...');
  
  try {
    // Get all pending recruits
    const allRecruits = await db.select().from(pendingRecruits);
    console.log(`Found ${allRecruits.length} total pending recruits`);
    
    // Get all users with admin/founder roles
    const adminUsers = await db.select().from(users).where(
      inArray(users.role, ['admin', 'founder'])
    );
    const adminIds = adminUsers.map(u => u.id);
    console.log(`Found ${adminIds.length} admin users:`, adminIds);
    
    // Find recruits created by admin users
    const adminGeneratedRecruits = allRecruits.filter(recruit => 
      adminIds.includes(recruit.recruiterId)
    );
    console.log(`Found ${adminGeneratedRecruits.length} admin-generated recruits`);
    
    if (adminGeneratedRecruits.length === 0) {
      console.log('✅ No admin-generated recruits to fix');
      return;
    }
    
    // Update each admin-generated recruit
    for (const recruit of adminGeneratedRecruits) {
      console.log(`Fixing recruit ${recruit.id} (${recruit.email})`);
      
      // Update status to 'awaiting_admin' and uplineDecision to 'approved'
      await db.update(pendingRecruits)
        .set({
          status: 'awaiting_admin',
          uplineDecision: 'approved',
          updatedAt: new Date()
        })
        .where(eq(pendingRecruits.id, recruit.id));
      
      console.log(`✅ Updated ${recruit.email}`);
    }
    
    console.log('🎉 All existing admin-generated recruits have been fixed!');
    console.log('They should now appear in the admin dashboard with correct status.');
    
  } catch (error) {
    console.error('❌ Error fixing recruits:', error);
  }
}

// Run the fix
fixExistingRecruits()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
