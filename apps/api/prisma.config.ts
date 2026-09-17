import 'dotenv/config';
import { defineConfig } from 'prisma/config';
export default defineConfig({schema:'prisma/schema.prisma',datasource:{url:process.env.DATABASE_URL ?? 'mysql://unconfigured:unconfigured@127.0.0.1:3306/uni-nexus_db'}});
