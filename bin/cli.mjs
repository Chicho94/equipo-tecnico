#!/usr/bin/env node
// npx equipo-tecnico install | uninstall
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { revisar } from "../scripts/validar.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENIDO = ["SKILL.md", "metodo.md", "plantillas", "scripts"];
const configClaude = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const DESTINO = join(configClaude, "skills", "equipo-tecnico");

const AYUDA = `equipo-tecnico: skill de Claude Code para que una persona no técnica dirija un equipo de agentes.

  npx equipo-tecnico install     instala o actualiza la skill en ${DESTINO}
  npx equipo-tecnico uninstall   la desinstala
`;

function instalar() {
  // Validar antes de borrar: si las plantillas vinieran mal, la instalación anterior queda intacta.
  const previa = revisar(join(RAIZ, "plantillas"), "plantillas");
  if (previa.codigo !== 0) {
    for (const l of previa.lineas) console.error(l);
    console.error("No se instaló: el paquete trae plantillas inválidas.");
    return 1;
  }
  rmSync(DESTINO, { recursive: true, force: true });
  mkdirSync(DESTINO, { recursive: true });
  for (const parte of CONTENIDO) cpSync(join(RAIZ, parte), join(DESTINO, parte), { recursive: true });
  console.log(`Listo. Skill instalada en ${DESTINO}`);
  console.log("Abre una sesión nueva de Claude Code y escribe /equipo-tecnico para empezar.");
  return 0;
}

function desinstalar() {
  if (!existsSync(DESTINO)) {
    console.log("La skill no estaba instalada.");
    return 0;
  }
  rmSync(DESTINO, { recursive: true, force: true });
  console.log(`Skill desinstalada de ${DESTINO}`);
  return 0;
}

const comando = process.argv[2];
if (comando === "install") process.exit(instalar());
if (comando === "uninstall") process.exit(desinstalar());
console.log(AYUDA);
process.exit(comando === "help" || comando === "--help" ? 0 : 1);
