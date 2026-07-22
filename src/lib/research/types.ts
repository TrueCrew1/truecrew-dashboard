/** How a research queue row entered the system. */
export type ResearchRequestSource = "adapter" | "session";

export interface ResearchRequest {
  id: string;
  topic: string;
  whyItMatters: string;
  suggestedOutcome: string;
  createdAt: string;
  source: ResearchRequestSource;
}
