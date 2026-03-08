import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("../db/index", () => ({
  db: {
    insert: vi.fn(),
    delete: vi.fn(),
    query: {
      memories: {
        findMany: vi.fn(),
      },
    },
  },
  pool: {
    query: vi.fn(),
  },
}));

// Mock the embedding service
vi.mock("../services/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

// Mock the importance service
vi.mock("../services/importance", () => ({
  scoreImportance: vi.fn().mockResolvedValue(0.7),
}));

import { db, pool } from "../db/index";
import {
  storeMemory,
  storeMemories,
  getMemories,
  deleteMemory,
} from "../services/memory";

describe("Memory Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("storeMemory", () => {
    it("should store a memory with LLM-scored importance", async () => {
      const mockMemory = {
        id: "test-uuid",
        namespace: "user:alice",
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

      vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

      const mockInsert = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMemory]),
        }),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsert as any);

      const result = await storeMemory("user:alice", "I like TypeScript");

      expect(result).toEqual(mockMemory);
      expect(result.importance).toBe(0.7);
      expect(db.insert).toHaveBeenCalled();
    });

    it("should return existing memory if duplicate detected", async () => {
      const existingMemory = {
        id: "existing-uuid",
        namespace: "user:alice",
        content: "I like TypeScript",
        embedding: new Array(1536).fill(0.1),
        importance: 0.7,
        archived: false,
        created_at: new Date(),
        last_accessed: new Date(),
        metadata: {},
        similarity: 0.98,
      };

      vi.mocked(pool.query).mockResolvedValue({
        rows: [existingMemory],
      } as any);

      const result = await storeMemory("user:alice", "I like TypeScript");

      expect((result as any).deduplicated).toBe(true);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("should store a memory with tags and TTL", async () => {
      const mockMemory = {
        id: "test-uuid-2",
        namespace: "user:alice",
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

      vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

      const mockInsert = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMemory]),
        }),
      };

      vi.mocked(db.insert).mockReturnValue(mockInsert as any);

      const result = await storeMemory("user:alice", "I prefer dark mode", {
        tags: ["preference", "ui"],
        metadata: { source: "conversation" },
        ttl: 86400,
      });

      expect(result.tags).toEqual(["preference", "ui"]);
      expect(result.metadata).toEqual({ source: "conversation" });
    });
  });

  describe("storeMemories (batch)", () => {
    it("should store multiple memories in batch", async () => {
      const mockResults = [
        {
          id: "1",
          namespace: "user:alice",
          content: "Memory 1",
          embedding: new Array(1536).fill(0.1),
          importance: 0.7,
          tags: ["a"],
        },
        {
          id: "2",
          namespace: "user:alice",
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

      vi.mocked(db.insert).mockReturnValue(mockInsert as any);

      const result = await storeMemories("user:alice", [
        { content: "Memory 1", tags: ["a"] },
        { content: "Memory 2", tags: ["b"] },
      ]);

      expect(result).toHaveLength(2);
      expect(db.insert).toHaveBeenCalledTimes(1); // single batch insert
    });
  });

  describe("getMemories", () => {
    it("should return memories for a namespace", async () => {
      const mockMemories = [
        {
          id: "1",
          namespace: "user:alice",
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
        {
          id: "2",
          namespace: "user:alice",
          content: "Memory 2",
          embedding: null,
          importance: 0.8,
          tags: ["dev"],
          memoryType: null,
          archived: false,
          expiresAt: null,
          createdAt: new Date(),
          lastAccessed: new Date(),
          metadata: null,
        },
      ];

      vi.mocked(db.query.memories.findMany).mockResolvedValue(mockMemories);

      const result = await getMemories("user:alice");

      expect(result).toEqual(mockMemories);
      expect(result).toHaveLength(2);
    });

    it("should respect the limit parameter", async () => {
      vi.mocked(db.query.memories.findMany).mockResolvedValue([]);

      await getMemories("user:alice", 10);

      expect(db.query.memories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });
  });

  describe("deleteMemory", () => {
    it("should delete a memory by id", async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

      await deleteMemory("test-uuid");

      expect(db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });
});
