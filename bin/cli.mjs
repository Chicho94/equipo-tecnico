#!/usr/bin/env node
// npx equipo-tecnico install|uninstall [--para claude|codex|gemini|kimi|todas]
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PLATAFORMAS } from "../scripts/plataformas.mjs";
import { revisar } from "../scripts/validar.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENIDO = ["SKILL.md", "metodo.md", "plantillas", "scripts"];
const NOMBRES = Object.keys(PLATAFORMAS);

const AYUDA = `equipo-tecnico: skill para que una persona no técnica dirija un equipo de agentes de IA.

  npx equipo-tecnico install                  instala o actualiza la skill en todas las herramientas que encuentre
                                              (Claude Code, Codex, Gemini CLI, Kimi Code)
  npx equipo-tecnico install --para codex     solo para una (claude, codex, gemini, kimi o todas)
  npx equipo-tecnico uninstall [--para …]     la desinstala (sin --para, de todas)
`;

// Carpetas de skills de cada herramienta; Codex y Kimi comparten ~/.agents/skills, así que se instala una sola vez.
// Sin --para: las herramientas que estén instaladas en este computador; si no hay ninguna, todas.
function detectadas() {
  const encontradas = NOMBRES.filter((p) => existsSync(PLATAFORMAS[p].instalada()));
  return encontradas.length ? encontradas : NOMBRES;
}

function destinos(para) {
  const elegidas = para === "auto" ? detectadas() : para === "todas" ? NOMBRES : [para];
  return [...new Map(elegidas.map((p) => [PLATAFORMAS[p].skills(), PLATAFORMAS[p].nombre])).entries()].map(
    ([carpeta, nombre]) => ({ destino: join(carpeta, "equipo-tecnico"), nombre }),
  );
}

function instalar(para) {
  // Validar antes de borrar: si las plantillas vinieran mal, la instalación anterior queda intacta.
  const previa = revisar(join(RAIZ, "plantillas"), "plantillas");
  if (previa.codigo !== 0) {
    for (const l of previa.lineas) console.error(l);
    console.error("No se instaló: el paquete trae plantillas inválidas.");
    return 1;
  }
  for (const { destino, nombre } of destinos(para)) {
    rmSync(destino, { recursive: true, force: true });
    mkdirSync(destino, { recursive: true });
    for (const parte of CONTENIDO) cpSync(join(RAIZ, parte), join(destino, parte), { recursive: true });
    console.log(`Listo para ${nombre}: ${destino}`);
  }
  console.log("Abre una sesión nueva de tu herramienta y pide usar la skill equipo-tecnico (en Claude Code: /equipo-tecnico).");
  return 0;
}

function desinstalar(para) {
  for (const { destino, nombre } of destinos(para)) {
    if (!existsSync(destino)) {
      console.log(`No estaba instalada para ${nombre}.`);
      continue;
    }
    rmSync(destino, { recursive: true, force: true });
    console.log(`Desinstalada de ${nombre}: ${destino}`);
  }
  return 0;
}

const [comando, ...resto] = process.argv.slice(2);
const i = resto.indexOf("--para");
const para = i !== -1 ? resto[i + 1] : comando === "uninstall" ? "todas" : "auto";
if ((comando === "install" || comando === "uninstall") && !["auto", "todas", ...NOMBRES].includes(para)) {
  console.log(`Herramienta desconocida: «${para}». Usa una de: ${[...NOMBRES, "todas"].join(", ")}.\n`);
  console.log(AYUDA);
  process.exit(1);
}
if (comando === "install") process.exit(instalar(para));
if (comando === "uninstall") process.exit(desinstalar(para));
console.log(AYUDA);
process.exit(comando === "help" || comando === "--help" ? 0 : 1);
