/**
 * Load .env then .env.local before any src/llm imports.
 * Separate file so ESM evaluates dotenv before router clients read process.env.
 */
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });
