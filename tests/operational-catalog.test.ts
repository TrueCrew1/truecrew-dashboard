import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INTEGRATIONS_INVENTORY } from "../lib/ops/integrationsInventory.js";
import { TOOL_GOVERNANCE_CATALOG } from "../lib/ops/toolGovernanceCatalog.js";
import {
  listCatalogIds,
  validateIntegrationsInventory,
  validateToolGovernanceCatalog,
} from "../lib/ops/validateCatalog.js";
import { describe, expect, it } from "vitest";

function readDoc(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function expectDocContainsIds(doc: string, ids: string[]): void {
  for (const id of ids) {
    expect(doc, `missing catalog id in doc: ${id}`).toContain(`\`${id}\``);
  }
}

describe("operational catalog", () => {
  it("validates tool governance catalog shape", () => {
    expect(() => validateToolGovernanceCatalog(TOOL_GOVERNANCE_CATALOG)).not.toThrow();
    expect(TOOL_GOVERNANCE_CATALOG.length).toBeGreaterThanOrEqual(5);
  });

  it("validates integrations inventory shape", () => {
    expect(() => validateIntegrationsInventory(INTEGRATIONS_INVENTORY)).not.toThrow();
    expect(INTEGRATIONS_INVENTORY.length).toBeGreaterThanOrEqual(8);
  });

  it("marks partial and not_wired integrations honestly", () => {
    const byId = Object.fromEntries(
      INTEGRATIONS_INVENTORY.map((entry) => [entry.id, entry.status]),
    );
    expect(byId.supabase).toBe("active");
    expect(byId.slack).toBe("partial");
    expect(byId["google-drive-workspace"]).toBe("not_wired");
    expect(byId["vercel-mcp"]).toBe("partial");
  });

  it("keeps internal docs aligned with catalog ids", () => {
    const toolDoc = readDoc("docs/internal/tool-governance-catalog.md");
    const integrationDoc = readDoc("docs/internal/integrations-inventory.md");

    expectDocContainsIds(toolDoc, listCatalogIds(TOOL_GOVERNANCE_CATALOG));
    expectDocContainsIds(integrationDoc, listCatalogIds(INTEGRATIONS_INVENTORY));
  });
});
