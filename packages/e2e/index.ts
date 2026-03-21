import "dotenv/config";
import { MemLib } from "memlib";

const memlib = new MemLib({
  apiKey: process.env.MEMLIB_API_KEY!,
  namespace: "e2e",
});

(async () => {
  const m = await memlib.store({
    entity: "anish",
    content: "I love MemLib",
  });

  console.log(m);
})();
