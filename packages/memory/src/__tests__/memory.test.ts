import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MemoryDeps } from "../config";
import {
  storeMemory,
  storeMemories,
  getMemories,
  deleteMemory,
} from "../services/memory";

const mockDb = {
  insert: vi.fn(),
  delete: vi.fn(),
  query: {
    memories: {
      findMany: vi.fn(),
    },
  },
};

const mockPool = { query: vi.fn() };
const mockGenerateEmbedding = vi
  .fn()
  .mockResolvedValue(new Array(1536).fill(0.1));
const mockGenerateText = vi.fn().mockResolvedValue("0.7");

const deps = {
  db: mockDb,
  pool: mockPool,
  generateEmbedding: mockGenerateEmbedding,
  generateText: mockGenerateText,
} as unknown as MemoryDeps;

describe("Memory Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("storeMemory", () => {
    it("should store a memory with LLM-scored importance", async () => {
      const mockMemory = {
        id: "test-uuid",
        namespace: "agent-1",
        entity: "user-alice",
        content: "I like TypeScript",
        embedding: new Array(1536).fill(0.1),
        importance: 0.7,
        tags: [],
        memoryType: null,
        archived: false,
        expiresAt: null,
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {},
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const mockInsert = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMemory]),
        }),
      };

      mockDb.insert.mockReturnValue(mockInsert);

      const result = await storeMemory(
        deps,
        "agent-1",
        "user-alice",
        "I like TypeScript",
      );

      expect(result).toEqual(mockMemory);
      expect(result.importance).toBe(0.7);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return existing memory if duplicate detected", async () => {
      const existingMemory = {
        id: "existing-uuid",
        namespace: "agent-1",
        entity: "user-alice",
        content: "I like TypeScript",
        embedding: new Array(1536).fill(0.1),
        importance: 0.7,
        archived: false,
        created_at: new Date(),
        last_accessed: new Date(),
        metadata: {},
        similarity: 0.98,
      };

      mockPool.query.mockResolvedValue({ rows: [existingMemory] });

      const result = await storeMemory(
        deps,
        "agent-1",
        "user-alice",
        "I like TypeScript",
      );

      expect((result as any).deduplicated).toBe(true);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("should store a memory with tags and TTL", async () => {
      const mockMemory = {
        id: "test-uuid-2",
        namespace: "agent-1",
        entity: "user-alice",
        content: "I prefer dark mode",
        embedding: new Array(1536).fill(0.1),
        importance: 0.7,
        tags: ["preference", "ui"],
        memoryType: null,
        archived: false,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: { source: "conversation" },
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      const mockInsert = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMemory]),
        }),
      };

      mockDb.insert.mockReturnValue(mockInsert);

      const result = await storeMemory(
        deps,
        "agent-1",
        "user-alice",
        "I prefer dark mode",
        {
          tags: ["preference", "ui"],
          metadata: { source: "conversation" },
          ttl: 86400,
        },
      );

      expect(result.tags).toEqual(["preference", "ui"]);
      expect(result.metadata).toEqual({ source: "conversation" });
    });
  });

  describe("storeMemories (batch)", () => {
    it("should store multiple memories in batch", async () => {
      const mockResults = [
        {
          id: "1",
          namespace: "agent-1",
          entity: "user-alice",
          content: "Memory 1",
          embedding: new Array(1536).fill(0.1),
          importance: 0.7,
          tags: ["a"],
        },
        {
          id: "2",
          namespace: "agent-1",
          entity: "user-alice",
          content: "Memory 2",
          embedding: new Array(1536).fill(0.1),
          importance: 0.7,
          tags: ["b"],
        },
      ];

      const mockInsert = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockResults),
        }),
      };

      mockDb.insert.mockReturnValue(mockInsert);

      const result = await storeMemories(deps, "agent-1", "user-alice", [
        { content: "Memory 1", tags: ["a"] },
        { content: "Memory 2", tags: ["b"] },
      ]);

      expect(result).toHaveLength(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe("getMemories", () => {
    it("should return memories for a namespace", async () => {
      const mockMemories = [
        {
          id: "1",
          namespace: "agent-1",
          entity: "user-alice",
          content: "Memory 1",
          embedding: null,
          importance: 0.5,
          tags: [],
          memoryType: null,
          archived: false,
          expiresAt: null,
          createdAt: new Date(),
          lastAccessed: new Date(),
          metadata: null,
        },
      ];

      mockDb.query.memories.findMany.mockResolvedValue(mockMemories);

      const result = await getMemories(deps, "agent-1");

      expect(result).toEqual(mockMemories);
      expect(result).toHaveLength(1);
    });

    it("should filter by entity when provided", async () => {
      mockDb.query.memories.findMany.mockResolvedValue([]);

      await getMemories(deps, "agent-1", "user-alice", 10);

      expect(mockDb.query.memories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });
  });

  describe("deleteMemory", () => {
    it("should delete a memory by id", async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({ where: mockWhere });

      await deleteMemory(deps, "test-uuid");

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });
});
