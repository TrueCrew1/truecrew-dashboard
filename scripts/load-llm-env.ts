/** Load .env + .env.local before src/llm imports (ESM hoist-safe). */
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });
