export { db, pool } from "./db/index";
export { memories, type Memory, type NewMemory } from "./db/schema";

export {
  storeMemory,
  storeMemories,
  getMemories,
  deleteMemory,
  type StoreMemoryOptions,
} from "./services/memory";

export {
  retrieveMemories,
  type RetrievedMemory,
  type RecallOptions,
} from "./services/retrieval";

export {
  consolidateMemories,
  type StaleMemoryGroup,
  type ConsolidationResult,
} from "./services/consolidation";

export { generateEmbedding } from "./services/embedding";
export { generateText } from "./services/gemini";
export { scoreImportance } from "./services/importance";
