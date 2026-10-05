// Shared helpers for the static checks. No dependencies: only Node built-ins.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SYSTEM_PREFIX = "systems/sf_vtt/";

export const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
export const readJson = rel => JSON.parse(read(rel));
export const exists = rel => fs.existsSync(path.join(ROOT, rel));

/** Maps a Foundry path ("systems/sf_vtt/x") to a repo-relative one ("x"). */
export const toRepoPath = p => p.startsWith(SYSTEM_PREFIX) ? p.slice(SYSTEM_PREFIX.length) : p;

/** All files below `dir` (repo-relative, forward slashes) with one of `exts`. */
export function listFiles(dir, exts) {
    const out = [];
    const walk = d => {
        for (const entry of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
            const rel = `${d}/${entry.name}`;
            if (entry.isDirectory()) walk(rel);
            else if (exts.some(e => entry.name.endsWith(e))) out.push(rel);
        }
    };
    walk(dir);
    return out;
}

export const templateFiles = () => listFiles("templates", [".hbs", ".html"]);
export const jsFiles = () => ["sf_vtt.js", ...listFiles("modules", [".js"])];

/** Flattens nested objects to dotted keys: {a:{b:1}} -> {"a.b":1}. Mixed flat/nested JSON is fine. */
export function flatten(obj, prefix = "", out = {}) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
        else out[key] = v;
    }
    return out;
}

/** Removes comments so commented-out code does not count as usage. */
export const stripJsComments = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
export const stripHbsComments = s => s.replace(/\{\{!--[\s\S]*?--\}\}/g, "").replace(/\{\{![\s\S]*?\}\}/g, "");
export const stripHtmlComments = s => s.replace(/<!--[\s\S]*?-->/g, "");
