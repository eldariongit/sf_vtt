import test from "node:test";
import assert from "node:assert/strict";
import {
    read, readJson, exists, flatten, jsFiles, templateFiles, toRepoPath,
    stripHbsComments, stripHtmlComments, stripJsComments,
} from "./helpers.js";

const schema = readJson("template.json");
const entry = stripJsComments(read("sf_vtt.js"));

const SYSTEM_PATH_RE = /systems\/sf_vtt\/[A-Za-z0-9_./-]+/g;

/** Template text with comments, <script> and <style> bodies, and {{...}} expressions removed. */
const markupOf = file => stripHtmlComments(stripHbsComments(read(file)))
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/\{\{[\s\S]*?\}\}/g, "");

test("every systems/sf_vtt/... path in code and templates points to a real file", () => {
    const refs = [...jsFiles(), ...templateFiles()].flatMap(f =>
        [...stripJsComments(read(f)).matchAll(SYSTEM_PATH_RE)].map(m => ({ file: f, path: m[0] })));
    assert.ok(refs.length > 0, "no paths found; the test is broken");
    const missing = refs.filter(r => !exists(toRepoPath(r.path))).map(r => `${r.path} (${r.file})`);
    assert.deepEqual([...new Set(missing)], []);
});

test("every partial used in a template is preloaded in sf_vtt.js", () => {
    const preloaded = new Set(entry.match(SYSTEM_PATH_RE));
    const unloaded = templateFiles().flatMap(f =>
        [...stripHbsComments(read(f)).matchAll(/\{\{>\s*["']?([^"'\s}]+)/g)]
            .filter(m => !preloaded.has(m[1]))
            .map(m => `${m[1]} (${f})`));
    assert.deepEqual(unloaded, []);
});

test("every preloaded partial is used and every .hbs partial is preloaded", () => {
    const preloaded = [...entry.matchAll(/["'](systems\/sf_vtt\/templates\/partials\/[^"']+)["']/g)].map(m => m[1]);
    const onDisk = templateFiles().filter(f => f.startsWith("templates/partials/")).map(f => `systems/sf_vtt/${f}`);
    assert.deepEqual(onDisk.filter(p => !preloaded.includes(p)), [], "partial on disk but not preloaded");
    assert.deepEqual(preloaded.filter(p => !onDisk.includes(p)), [], "preloaded but not on disk");
});

test("Handlebars helpers used in templates are registered or built in", () => {
    const registered = new Set([...entry.matchAll(/registerHelper\(\s*["'](\w+)["']/g)].map(m => m[1]));
    const builtIn = new Set([
        "if", "unless", "each", "with", "lookup", "log", "else", "localize",
        // Foundry core helpers
        "numberInput", "numberFormat", "selectOptions", "radioBoxes", "formInput", "formGroup",
        "editor", "filePicker", "ifThen", "checked", "disabled", "eq", "ne", "lt", "gt", "and", "or", "not",
        "rangePicker", "colorPicker", "object", "json",
    ]);
    const unknown = templateFiles().flatMap(f =>
        [...stripHbsComments(read(f)).matchAll(/\{\{[#~]?\s*([A-Za-z_]\w*)\s+[^}]/g)]
            .map(m => m[1])
            .filter(h => !registered.has(h) && !builtIn.has(h))
            .map(h => `${h} (${f})`));
    assert.deepEqual([...new Set(unknown)], []);
});

test("Handlebars blocks are balanced", () => {
    const problems = [];
    for (const f of templateFiles()) {
        const src = stripHbsComments(read(f));
        const opens = [...src.matchAll(/\{\{#(\w+)/g)].map(m => m[1]);
        const closes = [...src.matchAll(/\{\{\/(\w+)/g)].map(m => m[1]);
        const count = list => list.reduce((acc, n) => ({ ...acc, [n]: (acc[n] ?? 0) + 1 }), {});
        const o = count(opens), c = count(closes);
        for (const name of new Set([...opens, ...closes])) {
            if ((o[name] ?? 0) !== (c[name] ?? 0)) problems.push(`${f}: {{#${name}}} x${o[name] ?? 0} vs {{/${name}}} x${c[name] ?? 0}`);
        }
    }
    assert.deepEqual(problems, []);
});

test("HTML tags are balanced in every template", () => {
    const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
    const problems = [];
    for (const f of templateFiles()) {
        const stack = [];
        for (const m of markupOf(f).matchAll(/<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g)) {
            const [, closing, rawName, selfClosing] = m;
            const name = rawName.toLowerCase();
            if (VOID.has(name) || selfClosing) continue;
            if (!closing) { stack.push(name); continue; }
            const top = stack.pop();
            if (top !== name) { problems.push(`${f}: </${name}> closes <${top ?? "nothing"}>`); break; }
        }
        if (stack.length) problems.push(`${f}: unclosed <${stack.join(">, <")}>`);
    }
    assert.deepEqual(problems, []);
});

test("element ids are unique within a template", () => {
    const problems = [];
    for (const f of templateFiles()) {
        const seen = new Set();
        for (const [, id] of stripHtmlComments(stripHbsComments(read(f))).matchAll(/\sid="([^"{}]+)"/g)) {
            if (seen.has(id)) problems.push(`${f}: duplicate id "${id}"`);
            seen.add(id);
        }
    }
    assert.deepEqual(problems, []);
});

test("every <label for> has a matching id in the same template", () => {
    const problems = [];
    for (const f of templateFiles()) {
        const src = stripHtmlComments(stripHbsComments(read(f)));
        const ids = new Set([...src.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
        for (const [, target] of src.matchAll(/<label[^>]*\sfor="([^"{}]+)"/g)) {
            if (!ids.has(target)) problems.push(`${f}: <label for="${target}"> has no target`);
        }
    }
    assert.deepEqual(problems, []);
});

test("form field names under system.* exist in template.json", () => {
    // Partials are only included by the Fighter sheet; NPC templates live under templates/sheets/npc.
    const schemaPaths = type => Object.keys(flatten(schema.Actor[type])).map(p => `system.${p}`);
    const toRegex = name => new RegExp("^" + name.split(/\{\{[^}]*\}\}/)
        .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^.]+") + "$");

    const problems = [];
    for (const f of templateFiles()) {
        const type = f.startsWith("templates/sheets/npc/") ? "NPC" : "Fighter";
        if (!f.startsWith("templates/sheets/") && !f.startsWith("templates/partials/")) continue;
        const paths = schemaPaths(type);
        const src = stripHtmlComments(stripHbsComments(read(f)));
        for (const [, name] of src.matchAll(/<(?:input|select|textarea)[^>]*\sname="(system\.[^"]+)"/g)) {
            const re = toRegex(name);
            if (!paths.some(p => re.test(p))) problems.push(`${f}: "${name}" is not in the ${type} schema`);
        }
    }
    assert.deepEqual(problems, []);
});

test("checkbox/number/text inputs always carry a name or id", () => {
    const problems = [];
    for (const f of templateFiles()) {
        for (const [tag] of stripHtmlComments(stripHbsComments(read(f))).matchAll(/<(?:input|select|textarea)\b[^>]*>/g)) {
            if (!/\s(name|id)=/.test(tag)) problems.push(`${f}: ${tag.slice(0, 80)}`);
        }
    }
    assert.deepEqual(problems, []);
});
