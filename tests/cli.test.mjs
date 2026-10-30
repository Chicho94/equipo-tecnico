import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(RAIZ, "bin", "cli.mjs");
const SKILL = readFileSync(join(RAIZ, "SKILL.md"), "utf8");

function conConfig(fn) {
  const config = mkdtempSync(join(tmpdir(), "et-config-"));
  const correr = (...args) =>
    spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: config } });
  try {
    return fn(join(config, "skills", "equipo-tecnico"), correr);
  } finally {
    rmSync(config, { recursive: true, force: true });
  }
}

test("install copia la skill a CLAUDE_CONFIG_DIR/skills/equipo-tecnico", () => {
  conConfig((destino, correr) => {
    const r = correr("install");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(existsSync(join(destino, "SKILL.md")));
    assert.ok(existsSync(join(destino, "metodo.md")));
    assert.ok(existsSync(join(destino, "scripts", "validar.mjs")));
    assert.equal(readdirSync(join(destino, "plantillas")).filter((n) => n.endsWith(".md")).length, 10);
    assert.ok(!existsSync(join(destino, "tests")));
    assert.ok(r.stdout.includes("/equipo-tecnico"), r.stdout);
  });
});

test("install de nuevo reemplaza la versión anterior", () => {
  conConfig((destino, correr) => {
    correr("install");
    writeFileSync(join(destino, "sobrante.md"), "viejo", "utf8");
    assert.equal(correr("install").status, 0);
    assert.ok(!existsSync(join(destino, "sobrante.md")));
  });
});

test("uninstall borra la skill", () => {
  conConfig((destino, correr) => {
    correr("install");
    assert.equal(correr("uninstall").status, 0);
    assert.ok(!existsSync(destino));
  });
});

test("sin comando muestra la ayuda y sale con 1", () => {
  conConfig((_, correr) => {
    const r = correr();
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("npx equipo-tecnico install"), r.stdout);
  });
});

test("SKILL.md llama al validador con node, no con python", () => {
  assert.ok(SKILL.includes("node \"<carpeta de esta skill>/scripts/validar.mjs\""));
  assert.ok(!SKILL.includes("python"));
});

test("SKILL.md conserva las reglas clave", () => {
  for (const frase of [
    "ofrécele una vez crear `LINEAMIENTOS.md`",
    "incluidos los de la primera tanda",
    "lee toda su documentación",
    "Si no hay documentación",
    "Lo que entendí del proyecto",
    "en el mismo mensaje",
  ]) assert.ok(SKILL.includes(frase), frase);
});
