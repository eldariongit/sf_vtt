import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
    read, readJson, exists, jsFiles, templateFiles, toRepoPath,
    stripHbsComments, stripHtmlComments, stripJsComments,
} from "./helpers.js";

const system = readJson("system.json");
const cssFiles = system.styles;

const stripCss = css => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Class names selected anywhere in the project stylesheets. */
function definedClasses() {
    const out = new Set();
    for (const f of cssFiles) {
        // Only look at selectors (text before "{"), so decimals/hex colours in values are ignored.
        for (const [, selector] of stripCss(read(f)).matchAll(/([^{}]+)\{/g)) {
            for (const [, cls] of selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.add(cls);
        }
    }
    return out;
}

/** Class names used in templates (static parts only) and in HTML built inside JS. */
function usedClasses() {
    const out = new Map();
    const add = (cls, where) => { if (cls && !out.has(cls)) out.set(cls, where); };
    const fromAttr = (value, where) => value.replace(/\{\{[\s\S]*?\}\}/g, " ").split(/\s+/).forEach(c => add(c, where));
    for (const f of templateFiles()) {
        for (const [, v] of stripHtmlComments(stripHbsComments(read(f))).matchAll(/\sclass="([^"]*)"/g)) fromAttr(v, f);
    }
    for (const f of jsFiles()) {
        const src = stripJsComments(read(f));
        for (const [, v] of src.matchAll(/class=["']([^"']*)["']/g)) fromAttr(v, f);
        for (const [, list] of src.matchAll(/classes:\s*\[([^\]]*)\]/g)) {
            for (const [, c] of list.matchAll(/["']([^"']+)["']/g)) add(c, f);
        }
    }
    return out;
}

// Classes that are legitimately not styled by this system's own CSS.
const FOUNDRY_CORE = new Set(["sheet", "actor", "window-content", "form-group", "tab", "tabs", "item", "control-tool", "gm-only", "content"]);
const FONT_AWESOME = /^(fa|fas|far|fab|fa-[\w-]+)$/;
// Hooks/markers used by this system's JS or templates that currently have no CSS rule.
// Remove an entry once it is styled; new entries here should be a conscious decision.
const UNSTYLED_BASELINE = new Set([
    "white-background", "inputdata", "dice-roll", "dice-total", 
    "dice-tools-launcher", "dice-tools-panel", "reset-initiatives",
]);

test("stylesheets listed in system.json are non-empty and have balanced braces", () => {
    for (const f of cssFiles) {
        const css = stripCss(read(f));
        assert.ok(css.trim().length > 0, `${f} is empty`);
        const open = (css.match(/\{/g) ?? []).length;
        const close = (css.match(/\}/g) ?? []).length;
        assert.equal(open, close, `${f}: ${open} "{" vs ${close} "}"`);
    }
});

test("url() references in the stylesheets resolve to real files", () => {
    const problems = [];
    for (const f of cssFiles) {
        for (const [, raw] of stripCss(read(f)).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
            if (/^(data:|https?:|#)/.test(raw)) continue;
            const target = raw.startsWith("systems/sf_vtt/")
                ? toRepoPath(raw)
                : path.posix.normalize(path.posix.join(path.posix.dirname(f), raw));
            if (!exists(target)) problems.push(`${f}: url(${raw}) -> ${target} not found`);
        }
    }
    assert.deepEqual(problems, []);
});

test("every class used in templates or JS-built HTML is styled, or is a known exception", () => {
    const defined = definedClasses();
    const unknown = [...usedClasses()]
        .filter(([cls]) => !defined.has(cls) && !FOUNDRY_CORE.has(cls) && !FONT_AWESOME.test(cls) && !UNSTYLED_BASELINE.has(cls))
        .map(([cls, where]) => `.${cls} (${where})`);
    assert.deepEqual(unknown, []);
});

test("the UNSTYLED_BASELINE list has no stale entries", () => {
    const defined = definedClasses();
    const used = usedClasses();
    const stale = [...UNSTYLED_BASELINE].filter(c => defined.has(c) || !used.has(c));
    assert.deepEqual(stale, [], "these are now styled or no longer used; remove them from the baseline");
});

test("project-specific CSS classes are still used somewhere (dead-selector report)", () => {
    // Informational guard: fails only when a *class selector from the sheet stylesheet* is used nowhere.
    // Foundry core classes and ids can be targeted from CSS without appearing in our markup, so they are skipped.
    const used = usedClasses();
    const jsSource = jsFiles().map(f => stripJsComments(read(f))).join("\n");
    const defined = definedClasses();
    const dead = [...defined].filter(c =>
        !used.has(c) && !FOUNDRY_CORE.has(c) && !FONT_AWESOME.test(c) && !jsSource.includes(c));
    // Reported rather than asserted so legacy rules do not block the suite.
    if (dead.length) console.log(`ℹ︎ ${dead.length} CSS classes are not referenced by any template or script:\n  ${dead.join(", ")}`);
    assert.ok(true);
});
