import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // The build only needs a valid URL shape; runtime commands receive the real value.
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/kisbrief',
  },
});
