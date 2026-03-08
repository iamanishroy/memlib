// Core factory
export {
  createMemoryService,
  type MemoryService,
  type SafeMemory,
} from "./client";

// Config types
export type { MemoryConfig, MemoryDeps } from "./config";

// Schema & DB types
export { memories, type Memory, type NewMemory } from "./db/schema";

// Service types (for advanced usage)
export type { StoreMemoryOptions } from "./services/memory";
export type { RetrievedMemory, RecallOptions } from "./services/retrieval";
export type {
  StaleMemoryGroup,
  ConsolidationResult,
} from "./services/consolidation";
