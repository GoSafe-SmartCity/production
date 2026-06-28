import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const email = 'tctoan1024@gmail.com';
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { points: 150 }
    });
    console.log(`Updated points for ${email} to ${user.points}`);
  } catch (e: any) {
    console.log(`Update failed: ${e.message || e}`);
    // If user does not exist, let's create them!
    const user = await prisma.user.upsert({
      where: { email },
      update: { points: 150 },
      create: {
        email,
        name: 'tctoan1024',
        points: 150,
        consent: true,
        role: 'USER'
      }
    });
    console.log(`Upserted user ${email} with points ${user.points}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
