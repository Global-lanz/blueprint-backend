import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function runSeed() {
  try {
    console.log('Seeding database...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
    console.log('Seed completed successfully');
  } catch (error) {
    console.log('Seed skipped or already run');
  }
}

async function bootstrap() {
  dotenv.config();
  
  // Run migrations and seed before starting the app
  await runMigrations();
  await runSeed();
  
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
