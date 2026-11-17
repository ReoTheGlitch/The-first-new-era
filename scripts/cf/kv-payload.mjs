import fs from "node:fs";
import path from "node:path";

const [root, out] = process.argv.slice(2);
const items = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const key = path.relative(root, p).split(path.sep).join("/");
      if (key === "_headers" || key === "_redirects") continue;
      items.push({ key, value: fs.readFileSync(p).toString("base64"), base64: true });
    }
  }
})(root);
fs.writeFileSync(out, JSON.stringify(items));
console.log(`${items.length} files -> ${out}`);
