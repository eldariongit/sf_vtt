import test from "node:test";
import assert from "node:assert/strict";
import { read, readJson, flatten, jsFiles, templateFiles, stripJsComments, stripHbsComments } from "./helpers.js";

const lang = flatten(readJson("lang/en.json"));
const schema = readJson("template.json");

const keysIn = (files, regex, strip) =>
    files.flatMap(f => [...strip(read(f)).matchAll(regex)].map(m => ({ file: f, key: m[1] })));

const report = used => [...new Set(used.filter(u => !(u.key in lang)).map(u => `${u.key} (${u.file})`))];

test("every i18n key used in JS exists in lang/en.json", () => {
    const used = keysIn(jsFiles(), /i18n\.(?:localize|format)\(\s*["'`]([^"'`]+)["'`]/g, stripJsComments);
    assert.ok(used.length > 0, "regex found no keys; the test is broken");
    assert.deepEqual(report(used), []);
});

test("every {{localize}} key used in templates exists in lang/en.json", () => {
    const used = keysIn(templateFiles(), /\{\{\s*localize\s+["']([^"'{}]+)["']/g, stripHbsComments);
    assert.ok(used.length > 0, "regex found no keys; the test is broken");
    assert.deepEqual(report(used), []);
});

test("every label in template.json exists in lang/en.json", () => {
    const labels = [];
    const walk = node => {
        if (node && typeof node === "object") {
            if (typeof node.label === "string") labels.push(node.label);
            Object.values(node).forEach(walk);
        }
    };
    walk(schema);
    assert.deepEqual([...new Set(labels)].filter(l => !(l in lang)), []);
});

test("lang/en.json has no empty translations", () => {
    const empty = Object.entries(lang).filter(([, v]) => typeof v !== "string" || v.trim() === "");
    assert.deepEqual(empty.map(([k]) => k), []);
});

test("placeholders in translations are passed by the format() calls", () => {
    // format("SFVTT.Info.InitiativeSet", { name, value }) needs every {placeholder} in the text supplied.
    const calls = jsFiles().flatMap(f =>
        [...stripJsComments(read(f)).matchAll(/i18n\.format\(\s*["']([^"']+)["']\s*,\s*\{([^}]*)\}/g)]
            .map(m => ({ key: m[1], file: f, args: m[2].split(",").map(a => a.split(":")[0].trim()).filter(Boolean) })));
    const problems = [];
    for (const { key, args, file } of calls) {
        if (typeof lang[key] !== "string") continue; // reported by the missing-key test
        for (const [, p] of lang[key].matchAll(/\{(\w+)\}/g)) {
            if (!args.includes(p)) problems.push(`${key}: {${p}} is not passed in ${file}`);
        }
    }
    assert.deepEqual(problems, []);
});
