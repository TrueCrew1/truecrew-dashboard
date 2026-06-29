#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultVaultDir = path.join(repoRoot, "obsidian-vault");
const envPath = path.join(repoRoot, ".env.local");

function parseVaultArg(): string | null {
  const flag = process.argv.find((arg) => arg.startsWith("--vault="));
  return flag ? flag.slice("--vault=".length).trim() : null;
}

function writeEnvLocal(vaultPath: string): void {
  const line = `OBSIDIAN_VAULT_PATH=${vaultPath}\n`;
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, "utf8");
    if (existing.includes("OBSIDIAN_VAULT_PATH=")) {
      const updated = existing.replace(/^OBSIDIAN_VAULT_PATH=.*$/m, `OBSIDIAN_VAULT_PATH=${vaultPath}`);
      fs.writeFileSync(envPath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf8");
      return;
    }
    fs.writeFileSync(envPath, existing.endsWith("\n") ? `${existing}${line}` : `${existing}\n${line}`, "utf8");
    return;
  }
  fs.writeFileSync(envPath, line, "utf8");
}

function seedVaultReadme(vaultPath: string): void {
  const readmePath = path.join(vaultPath, "True Crew", "README.md");
  if (fs.existsSync(readmePath)) return;

  fs.mkdirSync(path.dirname(readmePath), { recursive: true });
  fs.writeFileSync(
    readmePath,
    `# True Crew vault notes

This folder is written by \`npm run obsidian:log\` from the True Crew repo.

- \`Operations/Logs/\` — build and PR rolling logs
- \`Decisions/\` — one note per decision
- \`True Crew/Hot Context.md\` — current focus (overwritten each update)

Open this **parent folder** (\`obsidian-vault\`) as an Obsidian vault, or point \`.env.local\` at your existing vault instead.
`,
    "utf8",
  );
}

function main(): void {
  const vaultPath = path.resolve(parseVaultArg() ?? defaultVaultDir);

  console.log("True Crew — Obsidian setup");
  console.log("==========================\n");

  fs.mkdirSync(vaultPath, { recursive: true });
  seedVaultReadme(vaultPath);
  writeEnvLocal(vaultPath);

  console.log(`✓ Vault folder: ${vaultPath}`);
  console.log(`✓ Wrote ${envPath}`);
  console.log("\nRunning verification...\n");

  execSync("npm run obsidian:verify", {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, OBSIDIAN_VAULT_PATH: vaultPath },
  });

  console.log("\nOpen in Obsidian:");
  console.log(`  1. Obsidian → Open folder as vault`);
  console.log(`  2. Select: ${vaultPath}`);
  console.log("\nDaily logging: docs/OBSIDIAN_LOGGING_QUICKSTART.md");
}

main();
