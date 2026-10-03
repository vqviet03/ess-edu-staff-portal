import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out"),
  base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, ""),
  port = Number(process.env.PORT ?? 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
http
  .createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (base && !(path === base || path.startsWith(base + "/"))) {
        res.writeHead(404);
        res.end();
        return;
      }
      path = path.slice(base.length);
      let file = resolve(root, "." + path);
      if (!file.startsWith(root + sep) && file !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      const content = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Không tìm thấy trang");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Static export: http://localhost:${port}${base}/`),
  );
