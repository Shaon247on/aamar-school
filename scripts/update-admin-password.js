const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedAdmin = await prisma.user.updateMany({
      where: {
        role: 'ADMIN',
        email: 'admin@greenwood.edu.bd'
      },
      data: {
        password: hashedPassword
      }
    });

    console.log(`✅ Admin password updated successfully!`);
    console.log(`📧 Email: admin@greenwood.edu.bd`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`📊 Updated ${updatedAdmin.count} admin user(s)`);

  } catch (error) {
    console.error('❌ Error updating admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword(); 