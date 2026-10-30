import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generar } from "../scripts/generar.mjs";
import { editado, revisar } from "../scripts/validar.mjs";

const DATOS = {
  PROYECTO: "Tienda Demo",
  STACK: "Node 22 + React 19",
  CARPETAS: "src/",
  CARPETAS_PROHIBIDAS: "tests/, docs/",
  COMANDOS: "npm test",
  LINEAMIENTOS: "LINEAMIENTOS.md",
  PUNTOS_CRITICOS: "el cobro nunca se duplica",
  FECHA: "2026-10-30",
};
const MODELOS_CODEX = { alto: "modelo-alto", medio: "modelo-medio", bajo: "modelo-bajo" };

function enProyecto(fn) {
  const proyecto = mkdtempSync(join(tmpdir(), "et-proy-"));
  try {
    return fn(proyecto);
  } finally {
    rmSync(proyecto, { recursive: true, force: true });
  }
}

test("claude: genera en .claude/agents con su modelo propio y pasa la validación", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({ rol: "architect", plataforma: "claude", datos: DATOS, proyecto });
    assert.equal(ruta, join(proyecto, ".claude", "agents", "architect.md"));
    const t = readFileSync(ruta, "utf8");
    assert.match(t, /^model: opus$/m);
    assert.ok(t.includes("Tienda Demo") && !t.includes("{{"));
    assert.equal(editado(ruta), false);
    assert.equal(revisar(join(proyecto, ".claude", "agents"), "agentes").codigo, 0);
  });
});

test("gemini: el revisor no recibe herramientas de escritura y usa modelo propio", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({ rol: "code-reviewer", plataforma: "gemini", datos: DATOS, proyecto });
    assert.equal(ruta, join(proyecto, ".gemini", "agents", "code-reviewer.md"));
    const t = readFileSync(ruta, "utf8");
    assert.match(t, /^tools: \[.*read_file.*\]$/m);
    assert.ok(!t.includes("write_file") && !/\breplace\b/.test(t.split("---")[1]), t);
    assert.match(t, /^model: pro$/m);
    assert.ok(!/^color:/m.test(t));
    assert.equal(revisar(join(proyecto, ".gemini", "agents"), "agentes").codigo, 0);
  });
});

test("kimi: herramientas como lista y aviso de que no admite modelo por agente", () => {
  enProyecto((proyecto) => {
    const { ruta, notas } = generar({ rol: "developer", plataforma: "kimi", datos: DATOS, proyecto });
    assert.equal(ruta, join(proyecto, ".kimi-code", "agents", "developer.md"));
    const t = readFileSync(ruta, "utf8");
    assert.match(t, /^tools: \[Read, Write, Edit, Grep, Glob, Bash\]$/m);
    assert.ok(!/^model:/m.test(t));
    assert.ok(notas.some((n) => n.includes("modelo")), notas.join(" | "));
    assert.equal(revisar(join(proyecto, ".kimi-code", "agents"), "agentes").codigo, 0);
  });
});

test("codex: exige que se definan los modelos (nunca hereda el del director)", () => {
  enProyecto((proyecto) => {
    assert.throws(() => generar({ rol: "code-reviewer", plataforma: "codex", datos: DATOS, proyecto }), /modelos/);
  });
});

test("codex: genera TOML con instrucciones, modelo y esfuerzo por nivel", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({
      rol: "code-reviewer", plataforma: "codex", datos: { ...DATOS, modelos: MODELOS_CODEX }, proyecto,
    });
    assert.equal(ruta, join(proyecto, ".codex", "agents", "code_reviewer.toml"));
    const t = readFileSync(ruta, "utf8");
    assert.match(t, /^# equipo-tecnico · plantilla: code-reviewer · /m);
    assert.match(t, /^name = "code_reviewer"$/m);
    assert.match(t, /^model = "modelo-alto"$/m);
    assert.match(t, /^model_reasoning_effort = "high"$/m);
    assert.match(t, /^developer_instructions = """$/m);
    assert.ok(t.includes("Revisor de Código") && !t.includes("{{"));
    assert.equal(editado(ruta), false);
    assert.equal(revisar(join(proyecto, ".codex", "agents"), "agentes").codigo, 0);
  });
});

test("codex: el tech-writer queda sin terminal", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({
      rol: "tech-writer", plataforma: "codex", datos: { ...DATOS, modelos: MODELOS_CODEX }, proyecto,
    });
    assert.match(readFileSync(ruta, "utf8"), /^shell_tool = false$/m);
  });
});

test("comunicación sí: claude y kimi reciben la herramienta Agent", () => {
  enProyecto((proyecto) => {
    for (const plataforma of ["claude", "kimi"]) {
      const { ruta } = generar({ rol: "developer", plataforma, datos: DATOS, proyecto, comunicacion: true });
      assert.ok(readFileSync(ruta, "utf8").split("---")[1].includes("Agent"), plataforma);
    }
    assert.equal(revisar(join(proyecto, ".claude", "agents"), "agentes").codigo, 0);
    assert.equal(revisar(join(proyecto, ".kimi-code", "agents"), "agentes").codigo, 0);
  });
});

test("comunicación sí: gemini avisa que no es posible; codex avisa la configuración necesaria", () => {
  enProyecto((proyecto) => {
    const g = generar({ rol: "developer", plataforma: "gemini", datos: DATOS, proyecto, comunicacion: true });
    assert.ok(g.notas.some((n) => n.includes("Gemini")), g.notas.join(" | "));
    const c = generar({
      rol: "developer", plataforma: "codex", datos: { ...DATOS, modelos: MODELOS_CODEX }, proyecto, comunicacion: true,
    });
    assert.ok(c.notas.some((n) => n.includes("max_depth")), c.notas.join(" | "));
  });
});

test("comunicación no: ningún agente recibe Agent", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({ rol: "developer", plataforma: "claude", datos: DATOS, proyecto });
    const t = readFileSync(ruta, "utf8");
    assert.ok(!t.split("---")[1].includes("Agent"));
    assert.ok(!t.includes("## Comunicación con el equipo"));
  });
});

test("comunicación sí: el agente recibe las reglas para consultar a otros roles", () => {
  enProyecto((proyecto) => {
    for (const plataforma of ["claude", "kimi"]) {
      const { ruta } = generar({ rol: "developer", plataforma, datos: DATOS, proyecto, comunicacion: true });
      const t = readFileSync(ruta, "utf8");
      assert.ok(t.includes("## Comunicación con el equipo"), plataforma);
      assert.ok(t.includes("territorio"), plataforma);
    }
  });
});

test("falta un dato: error que nombra el marcador", () => {
  enProyecto((proyecto) => {
    const { STACK, ...incompletos } = DATOS;
    assert.throws(() => generar({ rol: "developer", plataforma: "claude", datos: incompletos, proyecto }), /STACK/);
  });
});

test("los modelos se pueden cambiar desde los datos", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({
      rol: "architect", plataforma: "gemini", datos: { ...DATOS, modelos: { alto: "gemini-x-pro" } }, proyecto,
    });
    assert.match(readFileSync(ruta, "utf8"), /^model: gemini-x-pro$/m);
  });
});

test("modelos por herramienta: los de codex no se mezclan con gemini", () => {
  enProyecto((proyecto) => {
    const datos = { ...DATOS, modelos: { codex: MODELOS_CODEX } };
    const g = generar({ rol: "architect", plataforma: "gemini", datos, proyecto });
    assert.match(readFileSync(g.ruta, "utf8"), /^model: pro$/m);
    const c = generar({ rol: "architect", plataforma: "codex", datos, proyecto });
    assert.match(readFileSync(c.ruta, "utf8"), /^model = "modelo-alto"$/m);
  });
});

test("gemini: la marca registra comunicación «no» aunque se haya pedido, porque no es posible", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({ rol: "developer", plataforma: "gemini", datos: DATOS, proyecto, comunicacion: true });
    assert.match(readFileSync(ruta, "utf8"), /comunicacion: no/);
  });
});

test("validación: un agente de gemini sin modelo falla (no se permite heredar)", () => {
  enProyecto((proyecto) => {
    const { ruta } = generar({ rol: "developer", plataforma: "gemini", datos: DATOS, proyecto });
    writeFileSync(ruta, readFileSync(ruta, "utf8").replace(/^model: .*\n/m, ""), "utf8");
    const r = revisar(join(proyecto, ".gemini", "agents"), "agentes");
    assert.equal(r.codigo, 1);
    assert.ok(r.lineas.some((l) => l.includes("model")), r.lineas.join(" | "));
  });
});
