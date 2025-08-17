import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Only set WebSocket constructor in development
if (process.env.NODE_ENV !== 'production') {
  neonConfig.webSocketConstructor = ws;
}

// For production deployment, disable WebSocket features that can cause hanging
if (process.env.NODE_ENV === 'production') {
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });