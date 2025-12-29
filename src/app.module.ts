import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { StagesModule } from './modules/stages/stages.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TemplatesModule,
    ProjectsModule,
    TasksModule,
    SubtasksModule,
    StagesModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
