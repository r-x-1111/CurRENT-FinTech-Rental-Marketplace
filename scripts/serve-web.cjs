// Small local SPA server for testing an Expo web export. Never exposed publicly.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../dist");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
http
  .createServer((req, res) => {
    let requested;
    try {
      requested = path.resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (requested !== root && !requested.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const file =
      fs.existsSync(requested) && fs.statSync(requested).isFile()
        ? requested
        : path.join(root, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(503);
      res.end("Run npm run build:web first.");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("CurRENT web preview: http://127.0.0.1:4173"),
  );
