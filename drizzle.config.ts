import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit doesn't load .env.local automatically - load it explicitly
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
