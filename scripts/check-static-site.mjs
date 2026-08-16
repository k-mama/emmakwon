import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const SITE_ORIGIN = "https://emmakwon.pages.dev";

const requiredRoutes = [
  "/",
  "/sly-fairy/",
  "/emmaestro/",
  "/k-mama/",
  "/books/",
  "/studio/",
  "/studio/notes/",
];

const requiredFiles = ["404.html", "robots.txt", "sitemap.xml"];
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(OUT, relativePath));
}

function routeToHtml(route) {
  if (route === "/") return "index.html";
  const clean = route.replace(/^\/+|\/+$/g, "");
  return path.join(clean, "index.html");
}

function htmlRouteFromFile(relativeFile) {
  const normalized = relativeFile.split(path.sep).join("/");
  if (normalized === "index.html") return "/";
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`;
  }
  return `/${normalized}`;
}

function walk(dir, predicate = () => true) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full, predicate));
    } else if (predicate(full)) {
      result.push(full);
    }
  }
  return result;
}

function readOut(relativePath) {
  return fs.readFileSync(path.join(OUT, relativePath), "utf8");
}

function extract(html, regex) {
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractIds(html) {
  const ids = new Set();
  for (const match of html.matchAll(/\bid=["']([^"']+)["']/gi)) {
    ids.add(match[1]);
  }
  return ids;
}

function targetFileForPathname(pathname) {
  const clean = pathname.replace(/^\/+/, "");
  if (!clean) return "index.html";

  const exact = clean.replace(/\/$/, "");
  if (path.extname(exact)) return exact;

  const directoryIndex = path.join(exact, "index.html");
  if (exists(directoryIndex)) return directoryIndex;
  if (exists(exact)) return exact;
  return directoryIndex;
}

if (!fs.existsSync(OUT)) {
  console.error("Static integrity check failed: out/ does not exist. Run the build first.");
  process.exit(1);
}

for (const route of requiredRoutes) {
  const file = routeToHtml(route);
  if (!exists(file)) fail(`Missing required public route: ${route} (${file})`);
}

for (const file of requiredFiles) {
  if (!exists(file)) fail(`Missing required static file: ${file}`);
}

const htmlFiles = walk(OUT, (file) => file.endsWith(".html"));
const htmlByFile = new Map();
const idsByFile = new Map();
for (const absoluteFile of htmlFiles) {
  const relative = path.relative(OUT, absoluteFile);
  const html = fs.readFileSync(absoluteFile, "utf8");
  htmlByFile.set(relative, html);
  idsByFile.set(relative, extractIds(html));
}

const canonicals = new Map();
for (const route of requiredRoutes) {
  const file = routeToHtml(route);
  if (!htmlByFile.has(file)) continue;
  const html = htmlByFile.get(file);

  const canonical = extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)
    ?? extract(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const ogTitle = extract(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  const ogDescription = extract(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  const ogImage = extract(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  const twitterCard = extract(html, /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["'][^>]*>/i);

  if (!canonical) fail(`${route} is missing a canonical URL.`);
  else {
    if (!canonical.startsWith(SITE_ORIGIN)) fail(`${route} canonical is not absolute on ${SITE_ORIGIN}: ${canonical}`);
    if (canonicals.has(canonical)) fail(`Duplicate canonical URL on ${route} and ${canonicals.get(canonical)}: ${canonical}`);
    canonicals.set(canonical, route);
  }
  if (!ogTitle) fail(`${route} is missing og:title.`);
  if (!ogDescription) fail(`${route} is missing og:description.`);
  if (!ogImage) fail(`${route} is missing og:image.`);
  if (!twitterCard) fail(`${route} is missing twitter:card.`);
}

for (const [relativeFile, html] of htmlByFile) {
  const currentRoute = htmlRouteFromFile(relativeFile);
  const publicHtml = !currentRoute.startsWith("/admin/");

  for (const match of html.matchAll(/\b(href|src)=["']([^"']*)["']/gi)) {
    const attribute = match[1].toLowerCase();
    const rawTarget = match[2].trim().replaceAll("&amp;", "&");

    if (!rawTarget) {
      if (publicHtml) fail(`${currentRoute} has an empty ${attribute}.`);
      continue;
    }

    if (attribute === "href" && rawTarget === "#") {
      if (publicHtml) fail(`${currentRoute} contains placeholder href="#".`);
      continue;
    }

    if (/^(?:https?:|mailto:|tel:|data:|blob:|\/\/)/i.test(rawTarget)) continue;
    if (/^javascript:/i.test(rawTarget)) {
      if (publicHtml) fail(`${currentRoute} contains javascript: URL: ${rawTarget}`);
      continue;
    }

    let resolved;
    try {
      resolved = new URL(rawTarget, `${SITE_ORIGIN}${currentRoute}`);
    } catch {
      fail(`${currentRoute} contains an invalid ${attribute}: ${rawTarget}`);
      continue;
    }

    const targetFile = targetFileForPathname(resolved.pathname);
    if (!exists(targetFile)) {
      fail(`${currentRoute} -> ${rawTarget} resolves to missing output: ${targetFile}`);
      continue;
    }

    if (attribute === "href" && resolved.hash && targetFile.endsWith(".html")) {
      const fragment = decodeURIComponent(resolved.hash.slice(1));
      const targetIds = idsByFile.get(targetFile);
      if (targetIds && !targetIds.has(fragment)) {
        fail(`${currentRoute} -> ${rawTarget} points to missing #${fragment} in ${targetFile}`);
      }
    }
  }
}

if (exists("robots.txt")) {
  const robots = readOut("robots.txt");
  if (!/Disallow:\s*\/admin\//i.test(robots)) fail("robots.txt must disallow /admin/.");
  if (!robots.includes(`${SITE_ORIGIN}/sitemap.xml`)) fail("robots.txt must reference the production sitemap URL.");
}

if (exists("sitemap.xml")) {
  const sitemap = readOut("sitemap.xml");
  for (const route of requiredRoutes) {
    const expected = `${SITE_ORIGIN}${route}`;
    if (!sitemap.includes(expected)) fail(`sitemap.xml is missing ${expected}`);
  }
  if (sitemap.includes(`${SITE_ORIGIN}/admin/`)) fail("sitemap.xml must not expose /admin/ routes.");
}

const publishedNotePages = htmlFiles.filter((file) => {
  const relative = path.relative(OUT, file).split(path.sep).join("/");
  return /^studio\/notes\/[^/]+\/index\.html$/.test(relative);
});
if (publishedNotePages.length === 0) {
  warn("No published Studio Note detail pages were found in the static export.");
}

if (warnings.length) {
  console.warn("\nStatic integrity warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("\nStatic integrity check failed:");
  for (const error of errors) console.error(`- ${error}`);
  console.error(`\n${errors.length} error(s) found.`);
  process.exit(1);
}

console.log(`Static integrity check passed: ${htmlFiles.length} HTML files, ${publishedNotePages.length} published Studio Notes.`);
