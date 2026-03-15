// Core factory
export {
  createMemoryService,
  type MemoryService,
  type SafeMemory,
} from "./client";

// Config types
export type { MemoryConfig, MemoryDeps } from "./config";

// Schema & DB types
export {
  memories,
  memoryEvents,
  type Memory,
  type NewMemory,
  type MemoryEvent,
  type NewMemoryEvent,
} from "./db/schema";

// Service types (for advanced usage)
export type {
  StoreMemoryOptions,
  StoreSmartOptions,
  StoreResult,
} from "./services/memory";
export type { RetrievedMemory, RecallOptions } from "./services/retrieval";
export type {
  StaleMemoryGroup,
  ConsolidationResult,
} from "./services/consolidation";
export type { ExtractedFact, ExtractionResult } from "./services/extraction";
export type {
  Conflict,
  ConflictAction,
  ConflictResolution,
  ConflictResolutionResult,
} from "./services/conflict";
