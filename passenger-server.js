// Passenger entry point. cPanel's Application Manager starts a plain Node
// file; it cannot run `next start`, so this boots Next programmatically.
const { createServer } = require("http");
const next = require("next");

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000, () => {
    console.log("ready on", process.env.PORT || 3000);
  });
});
