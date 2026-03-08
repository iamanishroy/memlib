import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/index", () => ({
  pool: { query: vi.fn() },
}));

vi.mock("../services/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

import { pool } from "../db/index";
import { retrieveMemories } from "../services/retrieval";

describe("Retrieval Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return scored results", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            content: "Memory 1",
            tags: ["pref"],
            metadata: null,
            importance: 0.8,
            similarity: 0.9,
            recency: 0.5,
          },
        ],
      } as any)
      .mockResolvedValueOnce({ rows: [] } as any); // last_accessed update

    const result = await retrieveMemories("user:alice", "test query");

    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBeGreaterThan(0);
    expect(result[0]!.tags).toEqual(["pref"]);
  });

  it("should pass tag filter to SQL", async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await retrieveMemories("user:alice", "test", {
      tags: ["preference"],
      limit: 5,
    });

    const callArgs = vi.mocked(pool.query).mock.calls[0]!;
    const sql = callArgs[0] as string;
    expect(sql).toContain("tags && $");
  });

  it("should pass minImportance filter to SQL", async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await retrieveMemories("user:alice", "test", {
      minImportance: 0.7,
      limit: 5,
    });

    const callArgs = vi.mocked(pool.query).mock.calls[0]!;
    const sql = callArgs[0] as string;
    expect(sql).toContain("importance >= $");
  });

  it("should update last_accessed for retrieved memories", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "mem-1",
            content: "Test",
            tags: null,
            metadata: null,
            importance: "0.5",
            similarity: "0.8",
            recency: "0.5",
          },
        ],
      } as any)
      .mockResolvedValue({ rows: [] } as any);

    const results = await retrieveMemories("user:alice", "test query");

    expect(results).toHaveLength(1);
    // Find the UPDATE call among all calls
    const updateCall = vi
      .mocked(pool.query)
      .mock.calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].toLowerCase().includes("update memories set last_accessed"),
      );
    expect(updateCall).toBeDefined();
  });

  it("should accept numeric limit for backwards compat", async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await retrieveMemories("user:alice", "test", 5);

    const callArgs = vi.mocked(pool.query).mock.calls[0]!;
    const params = callArgs[1] as any[];
    expect(params[params.length - 1]).toBe(5);
  });
});
