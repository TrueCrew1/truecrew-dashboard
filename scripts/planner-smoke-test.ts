import { env } from "node:process";

const INTERNAL_API_SECRET = env.INTERNAL_API_SECRET;
if (!INTERNAL_API_SECRET) {
  console.error("INTERNAL_API_SECRET is not set");
  process.exit(1);
}

const url = "http://localhost:3004/api/runtime/planner/work-items";

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
