import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { editado, erroresAgente, erroresPlantilla, sellar } from "../scripts/validar.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = join(RAIZ, "tests", "fixtures");
const SCRIPT = join(RAIZ, "scripts", "validar.mjs");
const contiene = (errores, texto) => errores.some((e) => e.includes(texto));
const cli = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

function enTemporal(fixture, fn) {
  const tmp = mkdtempSync(join(tmpdir(), "et-"));
  try {
    const copia = join(tmp, "code-reviewer.md");
    copyFileSync(fixture, copia);
    return fn(copia);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test("plantilla válida pasa", () => {
  assert.deepEqual(erroresPlantilla(join(FIX, "plantilla_ok.md")), []);
});

test("reviewer con Write falla", () => {
  assert.ok(contiene(erroresPlantilla(join(FIX, "reviewer_con_write.md")), "tools"));
});

test("Agent prohibido", () => {
  assert.ok(contiene(erroresPlantilla(join(FIX, "con_agent.md")), "Agent"));
});

test("color gris falla", () => {
  assert.ok(contiene(erroresPlantilla(join(FIX, "color_gris.md")), "color"));
});

test("plantillas reales: 9 roles válidos", () => {
  const roles = readdirSync(join(RAIZ, "plantillas")).filter((n) => n.endsWith(".md") && n !== "lineamientos.md");
  assert.equal(roles.length, 9);
  for (const nombre of roles) assert.deepEqual(erroresPlantilla(join(RAIZ, "plantillas", nombre)), [], nombre);
});

test("agente con marcador sin rellenar falla", () => {
  assert.ok(contiene(erroresAgente(join(FIX, "malos", "code-reviewer.md")), "{{STACK}}"));
});

test("agente sin marca falla", () => {
  assert.ok(contiene(erroresAgente(join(FIX, "agente_sin_marca.md")), "marca"));
});

test("clave extra en el frontmatter falla", () => {
  assert.ok(contiene(erroresAgente(join(FIX, "clave_extra.md")), "permissionMode"));
});

test("sellar y verificar detectan la edición manual", () => {
  enTemporal(join(FIX, "buenos", "code-reviewer.md"), (copia) => {
    assert.match(sellar(copia), /^[0-9a-f]{64}$/);
    assert.equal(editado(copia), false);
    appendFileSync(copia, "Línea agregada a mano.\n", "utf8");
    assert.equal(editado(copia), true);
  });
});

test("misma huella que la versión Python (agentes ya sellados siguen intactos)", () => {
  enTemporal(join(FIX, "buenos", "code-reviewer.md"), (copia) => {
    assert.equal(sellar(copia), "80d709fdddcc70664b33460fc2f94ab3625bef6ca2e59e67a8e431574ccfcb0c");
  });
});

test("la huella no cambia si git convierte los saltos de línea a CRLF", () => {
  enTemporal(join(FIX, "buenos", "code-reviewer.md"), (copia) => {
    sellar(copia);
    writeFileSync(copia, readFileSync(copia, "utf8").replace(/\n/g, "\r\n"), "utf8");
    assert.equal(editado(copia), false);
  });
});

test("CLI: agentes malos → 1, buenos → 0", () => {
  assert.equal(cli("agentes", join(FIX, "malos")).status, 1);
  assert.equal(cli("agentes", join(FIX, "buenos")).status, 0);
});

test("CLI: agentes propios del usuario se ignoran", () => {
  const r = cli("agentes", join(FIX, "mixtos"));
  assert.equal(r.status, 0, r.stdout);
  assert.ok(r.stdout.includes("mi-agente.md") && r.stdout.includes("ignorado"), r.stdout);
});

test("CLI: verificar imprime editado en un archivo sin sello", () => {
  const r = cli("verificar", join(FIX, "agente_sin_marca.md"));
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), "editado");
});
