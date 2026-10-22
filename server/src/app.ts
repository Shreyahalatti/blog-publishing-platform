import path from "node:path";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import postRoutes from "./routes/posts";
import { errorHandler } from "./lib/errors";

const app = express();
const configuredOrigin = process.env.CLIENT_ORIGIN;

if (configuredOrigin) {
  app.use(cors({
    origin: configuredOrigin.split(",").map((origin) => origin.trim()),
    credentials: false,
  }));
}
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

const clientBuild = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientBuild));
app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api/")) {
    response.status(404).json({ error: "Endpoint not found." });
    return;
  }
  response.sendFile(path.join(clientBuild, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use(errorHandler);
export default app;
