import "dotenv/config";
import app from "./app";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured.");
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 chars.");
}

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Inkwell API listening on port ${port}`);
});

async function shutdown() {
  server.close();
  const { prisma } = await import("./lib/prisma.js");
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());