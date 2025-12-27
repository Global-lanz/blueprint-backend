import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@blueprint.local' },
    update: { password: hashed, name: 'admin' },
    create: { name: 'admin', email: 'admin@blueprint.local', password: hashed, role: 'ADMIN' },
  });

  // Also ensure a simple test client exists
  const clientPass = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'client@blueprint.local' },
    update: {},
    create: { name: 'client', email: 'client@blueprint.local', password: clientPass, role: 'CLIENT' },
  });

  const template = await prisma.template.upsert({
    where: { id: 'tpl1' },
    update: {},
    create: {
      id: 'tpl1',
      name: 'Product Template',
      tasks: {
        create: [
          {
            title: 'Define target audience',
            description: 'Who is the product for?',
            subtasks: { create: [{ description: 'Describe demographics' }, { description: 'Describe behaviours' }] },
          },
          {
            title: 'Define value proposition',
            description: 'Value proposition text',
            subtasks: { create: [{ description: 'Unique features' }, { description: 'Benefits' }] },
          },
        ],
      },
    },
  });

  console.log('Seeded admin:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
