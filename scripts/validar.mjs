#!/usr/bin/env node
// Valida plantillas y agentes generados por la skill equipo-tecnico.
//
// Uso:
//   node validar.mjs plantillas <carpeta>   revisa plantillas (marcadores permitidos)
//   node validar.mjs agentes <carpeta>      revisa agentes generados (ignora los propios del usuario)
//   node validar.mjs sellar <archivo>       escribe la huella del agente
//   node validar.mjs verificar <archivo>    imprime «intacto» o «editado»
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ESCRIBE = ["Read", "Write", "Edit", "Grep", "Glob", "Bash"];

// Fuente única de la tabla de roles (restricciones globales del plan).
export const ROLES = {
  "product-analyst": { tools: ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Write"], model: "sonnet", color: "blue" },
  architect: { tools: ["Read", "Grep", "Glob", "Bash", "Write"], model: "opus", color: "cyan" },
  "qa-engineer": { tools: ESCRIBE, model: "sonnet", color: "orange" },
  "backend-dev": { tools: ESCRIBE, model: "sonnet", color: "green" },
  "frontend-dev": { tools: ESCRIBE, model: "sonnet", color: "yellow" },
  developer: { tools: ESCRIBE, model: "sonnet", color: "green" },
  "devops-engineer": { tools: ESCRIBE, model: "sonnet", color: "purple" },
  "code-reviewer": { tools: ["Read", "Grep", "Glob", "Bash"], model: "opus", color: "red" },
  "tech-writer": { tools: ["Read", "Write", "Edit", "Grep", "Glob"], model: "haiku", color: "pink" },
};
const COLORES = new Set(["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]);
const CLAVES = new Set(["name", "description", "tools", "model", "color"]);
const NO_AGENTES = new Set(["lineamientos.md"]);
const FIRMA = "<!-- equipo-tecnico · plantilla:";
const MARCA = /^<!-- equipo-tecnico · plantilla: [a-z-]+ · fecha: \d{4}-\d{2}-\d{2} · huella: (?:[0-9a-f]{64}|-) -->$/;
const HUELLA = /huella: (?:[0-9a-f]{64}|-) -->/;

const texto = (ruta) => readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");

export function leerAgente(ruta) {
  const lineas = texto(ruta).split("\n");
  if (lineas[0]?.trim() !== "---") return [{}, lineas.join("\n")];
  const fin = lineas.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (fin === -1) return [{}, lineas.join("\n")];
  const meta = {};
  for (const linea of lineas.slice(1, fin)) {
    const i = linea.indexOf(":");
    if (i !== -1) meta[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
  }
  return [meta, lineas.slice(fin + 1).join("\n")];
}

export function erroresPlantilla(ruta) {
  const [meta, cuerpo] = leerAgente(ruta);
  if (Object.keys(meta).length === 0) return ["sin frontmatter"];
  const rol = meta.name ?? "";
  if (!(rol in ROLES)) return [`name «${rol}» no es un rol conocido`];
  const esperado = ROLES[rol];
  const errores = [];
  const tools = (meta.tools ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  if (tools.includes("Agent")) errores.push("tools incluye Agent: los agentes no lanzan a otros");
  const iguales = tools.length === esperado.tools.length && esperado.tools.every((t) => tools.includes(t));
  if (!iguales) errores.push(`tools [${tools.join(", ")}] no coincide con [${esperado.tools.join(", ")}]`);
  if (meta.model !== esperado.model) errores.push(`model «${meta.model}» debería ser «${esperado.model}»`);
  if (!COLORES.has(meta.color) || meta.color !== esperado.color)
    errores.push(`color «${meta.color}» debería ser «${esperado.color}»`);
  if (!meta.description) errores.push("falta description");
  for (const clave of Object.keys(meta).filter((c) => !CLAVES.has(c)).sort())
    errores.push(`clave no permitida en el frontmatter: ${clave}`);
  if (!cuerpo.includes("## Entrega")) errores.push("falta la sección «## Entrega»");
  if (!cuerpo.includes("Resumen para el humano")) errores.push("falta «Resumen para el humano»");
  return errores;
}

export function erroresAgente(ruta) {
  const errores = erroresPlantilla(ruta);
  for (const marcador of [...new Set(texto(ruta).match(/\{\{[A-Z_]+\}\}/g) ?? [])].sort())
    errores.push(`marcador sin rellenar ${marcador}`);
  const [, cuerpo] = leerAgente(ruta);
  const primera = cuerpo.split("\n").find((l) => l.trim()) ?? "";
  if (!MARCA.test(primera.trim())) errores.push("falta la marca de generación en la primera línea del cuerpo");
  return errores;
}

const huellaDe = (t) => createHash("sha256").update(t.replace(HUELLA, "huella: - -->"), "utf8").digest("hex");

export function sellar(ruta) {
  const t = texto(ruta);
  const huella = huellaDe(t);
  writeFileSync(ruta, t.replace(HUELLA, `huella: ${huella} -->`), "utf8");
  return huella;
}

export function editado(ruta) {
  const t = texto(ruta);
  const actual = t.match(/huella: ([0-9a-f]{64}|-) -->/);
  return !actual || actual[1] !== huellaDe(t);
}

export function revisar(carpeta, modo) {
  let archivos = readdirSync(carpeta)
    .filter((n) => n.endsWith(".md") && !NO_AGENTES.has(n))
    .sort()
    .map((n) => join(carpeta, n));
  const lineas = [];
  if (modo === "agentes") {
    // Los agentes propios del usuario no son del equipo: no se validan ni se tocan.
    const ajenos = archivos.filter((a) => !texto(a).includes(FIRMA));
    for (const a of ajenos) lineas.push(`${basename(a)}: ignorado (no lo generó equipo-tecnico)`);
    archivos = archivos.filter((a) => !ajenos.includes(a));
  }
  if (archivos.length === 0) return { codigo: 1, lineas: [...lineas, `${carpeta}: no hay archivos .md`] };
  const funcion = modo === "agentes" ? erroresAgente : erroresPlantilla;
  let codigo = 0;
  for (const archivo of archivos)
    for (const error of funcion(archivo)) {
      lineas.push(`${basename(archivo)}: ${error}`);
      codigo = 1;
    }
  return { codigo, lineas };
}

function main(argv) {
  const [accion, ruta] = argv;
  if (argv.length !== 2 || !["plantillas", "agentes", "sellar", "verificar"].includes(accion)) {
    console.log("Uso: node validar.mjs plantillas|agentes <carpeta> | sellar|verificar <archivo>");
    return 2;
  }
  if (accion === "sellar") {
    console.log(sellar(ruta));
    return 0;
  }
  if (accion === "verificar") {
    console.log(editado(ruta) ? "editado" : "intacto");
    return 0;
  }
  const { codigo, lineas } = revisar(ruta, accion);
  for (const l of lineas) console.log(l);
  return codigo;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
