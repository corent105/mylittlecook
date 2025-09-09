const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Setting up temporary project...');

  // Create a temporary user
  const tempUser = await prisma.user.upsert({
    where: { email: 'demo@mylittlecook.com' },
    update: {},
    create: {
      id: 'temp-user-1',
      email: 'demo@mylittlecook.com',
      name: 'Demo User',
    },
  });

  console.log('Created/found temp user:', tempUser.id);

  // Create a temporary project
  const tempProject = await prisma.project.upsert({
    where: { id: 'temp-project-1' },
    update: {},
    create: {
      id: 'temp-project-1',
      name: 'Demo Project',
      ownerId: tempUser.id,
    },
  });

  console.log('Created/found temp project:', tempProject.id);
  console.log('✅ Temporary project setup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error setting up temp project:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });