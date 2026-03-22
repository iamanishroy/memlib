import "dotenv/config";
import { MemLib } from "memlib";
import { testDiffs } from "./cases/diffs";

const memlib = new MemLib({
  apiKey: process.env.MEMLIB_API_KEY!,
  namespace: "e2e",
  baseUrl: "http://localhost:8001/api",
});

(async () => {
  //   const m = await memlib.store({
  //     entity: "anish",
  //     content: "I love MemLib",
  //   });

  //   console.log(m);

  await testDiffs(memlib);
})();
