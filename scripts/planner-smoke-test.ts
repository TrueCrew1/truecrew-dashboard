import { env } from "node:process";

// Load .env.local for local development
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") {
    console.error("Error loading .env.local:", error);
  }
}

const INTERNAL_API_SECRET = env.INTERNAL_API_SECRET;
if (!INTERNAL_API_SECRET) {
  console.error("INTERNAL_API_SECRET is not set");
  process.exit(1);
}

const baseUrl = env.PLANNER_RUNTIME_BASE_URL || "http://localhost:3000";
const url = `${baseUrl}/api/runtime/planner/work-items`;

// Debug output for request configuration
console.log(`INTERNAL_API_SECRET present: ${INTERNAL_API_SECRET ? "yes" : "no"}`);
if (INTERNAL_API_SECRET) {
  console.log(`INTERNAL_API_SECRET length: ${INTERNAL_API_SECRET.length}`);
}
console.log(`Base URL: ${baseUrl}`);
console.log(`Header: x-internal-key`);

const body = {
  inputPayload: {
    title: "Smoke test work item",
    description: "This is a smoke test",
  },
  triggerType: "manual",
  requestedBy: "operator",
};

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_API_SECRET,
    },
    body: JSON.stringify(body),
  });

  console.log(`HTTP Status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    const workItem = data.workItem;
    console.log(`Work Item ID: ${workItem.id}`);
    console.log(`Agent Role: ${workItem.agentRole}`);
    console.log(`Status: ${workItem.status}`);
    console.log(`Created At: ${workItem.createdAt}`);
  } else {
    const error = await response.json().catch(() => ({ error: "Failed to parse error response" }));
    console.error("Error response body:", JSON.stringify(error, null, 2));
  }
} catch (error) {
  console.error("Request failed:", error);
}
