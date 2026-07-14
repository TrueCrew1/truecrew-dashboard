#!/usr/bin/env node
import { fulfillResearchRequest } from "../lib/research/fulfillRequest";

const requestId = process.argv[2];
if (!requestId) {
  console.error("Usage: npm run research:fulfill -- <request-id>");
  process.exit(1);
}

const writtenPath = fulfillResearchRequest(requestId);
if (!writtenPath) {
  console.error(`No queued request or fulfillment builder for "${requestId}".`);
  process.exit(1);
}

console.log(`Wrote ${writtenPath}`);
