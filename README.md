# BluePrint Backend

NestJS backend with Prisma and JWT authentication.

## Setup

```powershell
cd blueprint-backend
npm ci
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Backend will run on http://localhost:3333.

Environment variables (in `.env`):
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- PORT

Routes:
- POST /auth/login
- POST /auth/register
- POST /templates (ADMIN)
- GET /templates
- POST /projects (create project)
- POST /projects/:id/task-answer
- POST /webhooks/create-client (placeholder for n8n)

Develop further validations, DTOs, guards and tests as needed.
