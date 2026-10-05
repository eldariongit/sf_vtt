import test from "node:test";
import assert from "node:assert/strict";
import { read, readJson, exists, flatten } from "./helpers.js";

const system = readJson("system.json");
const schema = readJson("template.json");

test("system.json has the fields Foundry requires", () => {
    for (const key of ["id", "title", "version", "compatibility", "esmodules"]) {
        assert.ok(system[key], `system.json is missing "${key}"`);
    }
    assert.equal(system.id, "sf_vtt", "id must match the folder name under Data/systems");
    assert.match(system.version, /^\d+\.\d+\.\d+$/);
    assert.ok(system.compatibility.minimum <= system.compatibility.maximum);
});

test("every file referenced by system.json exists", () => {
    const refs = [
        ...system.esmodules, ...(system.scripts ?? []), ...system.styles,
        ...system.languages.map(l => l.path),
    ];
    if (system.background) refs.push(system.background.replace(/^systems\/sf_vtt\//, ""));
    const missing = refs.filter(r => !exists(r));
    assert.deepEqual(missing, []);
});

test("primaryTokenAttribute resolves to a resource in every actor type", () => {
    const attr = system.primaryTokenAttribute;
    for (const type of schema.Actor.types) {
        const paths = Object.keys(flatten(schema.Actor[type]));
        assert.ok(paths.some(p => p === attr || p.startsWith(attr + ".")), `${type} has no "${attr}"`);
    }
});

test("template.json defines a schema for every declared actor type", () => {
    for (const type of schema.Actor.types) {
        assert.ok(schema.Actor[type], `Actor type "${type}" has no template`);
    }
});

test("defaults never exceed their max", () => {
    const problems = [];
    const check = (node, where) => {
        if (!node || typeof node !== "object") return;
        for (const field of ["value", "current"]) {
            if (typeof node[field] === "number" && typeof node.max === "number" && node[field] > node.max) {
                problems.push(`${where}: ${field} ${node[field]} > max ${node.max}`);
            }
        }
        for (const [k, v] of Object.entries(node)) check(v, `${where}.${k}`);
    };
    for (const type of schema.Actor.types) check(schema.Actor[type], type);
    assert.deepEqual(problems, []);
});

test("template.json and system.json have no duplicate keys", () => {
    // JSON.parse silently keeps the last duplicate, so scan each object level by hand.
    const problems = [];
    for (const file of ["template.json", "system.json"]) {
        const stack = [];
        const re = /"((?:[^"\\]|\\.)*)"\s*:|[{}]/g;
        const src = read(file);
        let m;
        while ((m = re.exec(src))) {
            if (m[0] === "{") stack.push(new Set());
            else if (m[0] === "}") stack.pop();
            else {
                const keys = stack[stack.length - 1];
                if (!keys) continue;
                if (keys.has(m[1])) problems.push(`${file}: duplicate key "${m[1]}"`);
                keys.add(m[1]);
            }
        }
    }
    assert.deepEqual(problems, []);
});
