import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(RAIZ, "bin", "cli.mjs");
const SKILL = readFileSync(join(RAIZ, "SKILL.md"), "utf8");

// Entorno sin las variables reales de las herramientas, para no tocar las carpetas del usuario.
function entornoAislado(home, extra = {}) {
  const env = { ...process.env, HOME: home, USERPROFILE: home, ...extra };
  for (const v of ["GEMINI_CLI_HOME", "CODEX_HOME", "KIMI_CODE_HOME"]) delete env[v];
  if (!("CLAUDE_CONFIG_DIR" in extra)) env.CLAUDE_CONFIG_DIR = join(home, ".claude");
  return env;
}

function conConfig(fn) {
  const config = mkdtempSync(join(tmpdir(), "et-config-"));
  const home = mkdtempSync(join(tmpdir(), "et-home-"));
  const env = entornoAislado(home, { CLAUDE_CONFIG_DIR: config });
  const correr = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env });
  try {
    return fn(join(config, "skills", "equipo-tecnico"), correr);
  } finally {
    rmSync(config, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
}

// Directorio personal falso: codex, gemini y kimi instalan bajo el home del usuario.
function conHome(fn) {
  const home = mkdtempSync(join(tmpdir(), "et-home-"));
  const env = entornoAislado(home);
  const correr = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env });
  try {
    return fn(home, correr);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test("install sin --para instala solo en las herramientas que encuentra", () => {
  conHome((home, correr) => {
    mkdirSync(join(home, ".codex"));
    mkdirSync(join(home, ".gemini"));
    const r = correr("install");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(existsSync(join(home, ".agents", "skills", "equipo-tecnico", "SKILL.md")), r.stdout);
    assert.ok(existsSync(join(home, ".gemini", "skills", "equipo-tecnico", "SKILL.md")), r.stdout);
    assert.ok(!existsSync(join(home, ".claude", "skills", "equipo-tecnico")), r.stdout);
  });
});

test("install sin --para y sin ninguna herramienta instala para todas", () => {
  conHome((home, correr) => {
    const r = correr("install");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    for (const d of [".claude", ".gemini", ".agents"]) assert.ok(existsSync(join(home, d, "skills", "equipo-tecnico", "SKILL.md")), d);
  });
});

test("uninstall sin --para la quita de todas partes", () => {
  conHome((home, correr) => {
    correr("install", "--para", "todas");
    assert.equal(correr("uninstall").status, 0);
    for (const d of [".claude", ".gemini", ".agents"]) assert.ok(!existsSync(join(home, d, "skills", "equipo-tecnico")), d);
  });
});

test("install --para codex y --para kimi usan ~/.agents/skills", () => {
  conHome((home, correr) => {
    const r = correr("install", "--para", "codex");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(existsSync(join(home, ".agents", "skills", "equipo-tecnico", "SKILL.md")));
    assert.ok(existsSync(join(home, ".agents", "skills", "equipo-tecnico", "scripts", "generar.mjs")));
    assert.ok(existsSync(join(home, ".agents", "skills", "equipo-tecnico", "scripts", "plataformas.mjs")));
    assert.equal(correr("install", "--para", "kimi").status, 0);
  });
});

test("install --para gemini usa ~/.gemini/skills", () => {
  conHome((home, correr) => {
    assert.equal(correr("install", "--para", "gemini").status, 0);
    assert.ok(existsSync(join(home, ".gemini", "skills", "equipo-tecnico", "SKILL.md")));
  });
});

test("install --para todas instala en las tres carpetas, y uninstall --para todas las borra", () => {
  conHome((home, correr) => {
    const r = correr("install", "--para", "todas");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const destinos = [join(home, ".claude"), join(home, ".gemini"), join(home, ".agents")].map((d) => join(d, "skills", "equipo-tecnico"));
    for (const d of destinos) assert.ok(existsSync(join(d, "SKILL.md")), d);
    assert.equal(correr("uninstall", "--para", "todas").status, 0);
    for (const d of destinos) assert.ok(!existsSync(d), d);
  });
});

test("install --para con una herramienta desconocida falla con un mensaje claro", () => {
  conHome((_, correr) => {
    const r = correr("install", "--para", "otra");
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("codex") && r.stdout.includes("gemini") && r.stdout.includes("kimi"), r.stdout);
  });
});

test("SKILL.md explica la herramienta, el generador, la comunicación y los modelos", () => {
  for (const frase of ["scripts/generar.mjs", "--comunicacion", "¿Los agentes pueden consultarse entre sí?", "nunca el del director"])
    assert.ok(SKILL.includes(frase), frase);
});

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
