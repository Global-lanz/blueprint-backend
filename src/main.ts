import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function seedDatabase() {
  const prisma = new PrismaClient();
  try {
    console.log('Seeding database...');
    
    // Create admin user
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@blueprint.local' },
      update: {},
      create: { 
        name: 'Admin User', 
        email: 'admin@blueprint.local', 
        password: hashedAdmin, 
        role: 'ADMIN' 
      },
    });
    console.log('✓ Admin user created:', admin.email);

    // Create client user
    const hashedClient = await bcrypt.hash('admin123', 10);
    const client = await prisma.user.upsert({
      where: { email: 'client@blueprint.local' },
      update: {},
      create: { 
        name: 'Client User', 
        email: 'client@blueprint.local', 
        password: hashedClient, 
        role: 'CLIENT' 
      },
    });
    console.log('✓ Client user created:', client.email);

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  dotenv.config();
  
  // Run migrations and seed before starting the app
  await runMigrations();
  await seedDatabase();
  
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
