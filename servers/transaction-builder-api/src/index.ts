import { createApp } from "./app";
import { createPublishedActionRepository } from "./actions/repository";

const port = Number(process.env.PORT ?? 3001);

export { createApp };

export const app = createApp({
  actionRepository: createPublishedActionRepository(),
});

if (import.meta.main) {
  app.listen(port);
  console.log(`Transaction Builder API listening on http://localhost:${port}`);
}
