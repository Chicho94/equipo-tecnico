#!/usr/bin/env node
// Valida plantillas y agentes generados por la skill equipo-tecnico (Claude Code, Codex, Gemini CLI, Kimi Code).
//
// Uso:
//   node validar.mjs plantillas <carpeta>   revisa plantillas (marcadores permitidos)
//   node validar.mjs agentes <carpeta>      revisa agentes generados (ignora los propios del usuario);
//                                           la herramienta se deduce de la carpeta (.claude, .codex, .gemini, .kimi-code)
//   node validar.mjs sellar <archivo>       escribe la huella del agente
//   node validar.mjs verificar <archivo>    imprime «intacto» o «editado»
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CARPETA_PLATAFORMA, herramientasDe, PLATAFORMAS, ROLES } from "./plataformas.mjs";

export { ROLES };

const COLORES = new Set(["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]);
const NO_AGENTES = new Set(["lineamientos.md"]);
const FIRMA = "equipo-tecnico · plantilla:";
const MARCA_MD =
  /^<!-- equipo-tecnico · plantilla: ([a-z-]+) · fecha: \d{4}-\d{2}-\d{2}(?: · comunicacion: (si|no))? · huella: (?:[0-9a-f]{64}|-) -->$/;
const MARCA_TOML =
  /^# equipo-tecnico · plantilla: ([a-z-]+) · fecha: \d{4}-\d{2}-\d{2} · comunicacion: (si|no) · huella: (?:[0-9a-f]{64}|-)$/;
const HUELLA = /huella: (?:[0-9a-f]{64}|-)/;

const texto = (ruta) => readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
const sinComillas = (v) => (/^".*"$/.test(v ?? "") ? JSON.parse(v) : v);
const comoLista = (v) => (v ?? "").replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean);
const mismoConjunto = (a, b) => a.length === b.length && b.every((x) => a.includes(x));

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

function erroresDeContenido(cuerpo, completo) {
  const errores = [];
  if (!cuerpo.includes("## Entrega")) errores.push("falta la sección «## Entrega»");
  if (!cuerpo.includes("Resumen para el humano")) errores.push("falta «Resumen para el humano»");
  if (completo) for (const m of [...new Set(cuerpo.match(/\{\{[A-Z_]+\}\}/g) ?? [])].sort()) errores.push(`marcador sin rellenar ${m}`);
  return errores;
}

// Plantillas: formato Claude Code, la fuente de todos los agentes.
export function erroresPlantilla(ruta) {
  const [meta, cuerpo] = leerAgente(ruta);
  if (Object.keys(meta).length === 0) return ["sin frontmatter"];
  const rol = meta.name ?? "";
  if (!(rol in ROLES)) return [`name «${rol}» no es un rol conocido`];
  const esperado = ROLES[rol];
  const errores = [];
  const tools = comoLista(meta.tools);
  if (tools.includes("Agent")) errores.push("tools incluye Agent: las plantillas no la traen; la agrega el generador si el usuario elige comunicación");
  if (!mismoConjunto(tools, esperado.tools)) errores.push(`tools [${tools.join(", ")}] no coincide con [${esperado.tools.join(", ")}]`);
  if (meta.model !== esperado.model) errores.push(`model «${meta.model}» debería ser «${esperado.model}»`);
  if (!COLORES.has(meta.color) || meta.color !== esperado.color) errores.push(`color «${meta.color}» debería ser «${esperado.color}»`);
  if (!meta.description) errores.push("falta description");
  for (const clave of Object.keys(meta).filter((c) => !PLATAFORMAS.claude.claves.includes(c)).sort())
    errores.push(`clave no permitida en el frontmatter: ${clave}`);
  return [...errores, ...erroresDeContenido(cuerpo, false)];
}

function erroresAgenteMd(ruta, plataforma) {
  const p = PLATAFORMAS[plataforma];
  const [meta, cuerpo] = leerAgente(ruta);
  if (Object.keys(meta).length === 0) return ["sin frontmatter"];
  const primera = cuerpo.split("\n").find((l) => l.trim()) ?? "";
  const marca = primera.trim().match(MARCA_MD);
  if (!marca) return ["falta la marca de generación en la primera línea del cuerpo", ...erroresDeContenido(cuerpo, true)];
  const rol = marca[1];
  if (!(rol in ROLES)) return [`la marca nombra un rol desconocido: ${rol}`];
  const errores = [];
  if (meta.name !== rol) errores.push(`name «${meta.name}» no coincide con la plantilla «${rol}»`);
  if (!sinComillas(meta.description)) errores.push("falta description");
  const tools = comoLista(meta.tools);
  const esperadas = herramientasDe(rol, plataforma, marca[2] === "si");
  if (tools.includes("Agent") && !esperadas.includes("Agent")) errores.push("tools incluye Agent sin que el usuario eligiera comunicación entre agentes");
  if (!mismoConjunto(tools, esperadas)) errores.push(`tools [${tools.join(", ")}] no coincide con [${esperadas.join(", ")}]`);
  if (p.modelos && !meta.model) errores.push("falta model: cada agente declara su modelo, no hereda el del director");
  if (p.claves.includes("color") && meta.color !== ROLES[rol].color) errores.push(`color «${meta.color}» debería ser «${ROLES[rol].color}»`);
  for (const clave of Object.keys(meta).filter((c) => !p.claves.includes(c)).sort()) errores.push(`clave no permitida en el frontmatter: ${clave}`);
  return [...errores, ...erroresDeContenido(cuerpo, true)];
}

function erroresAgenteToml(ruta) {
  const t = texto(ruta);
  const marca = (t.split("\n")[0] ?? "").match(MARCA_TOML);
  if (!marca) return ["falta la marca de generación en la primera línea"];
  const rol = marca[1];
  if (!(rol in ROLES)) return [`la marca nombra un rol desconocido: ${rol}`];
  const valor = (clave) => t.match(new RegExp(`^${clave} = "(.*)"$`, "m"))?.[1];
  const errores = [];
  if (valor("name") !== rol.replace(/-/g, "_")) errores.push(`name «${valor("name")}» no coincide con la plantilla «${rol}»`);
  if (!valor("description")) errores.push("falta description");
  if (!valor("model")) errores.push("falta model: cada agente declara su modelo, no hereda el del director");
  if (valor("model_reasoning_effort") !== PLATAFORMAS.codex.esfuerzo[ROLES[rol].nivel]) errores.push("model_reasoning_effort no corresponde al nivel del rol");
  const instrucciones = t.match(/^developer_instructions = """\n([\s\S]*?)\n"""$/m)?.[1];
  if (!instrucciones) return [...errores, "falta developer_instructions"];
  return [...errores, ...erroresDeContenido(instrucciones, true)];
}

export const plataformaDe = (carpeta) => CARPETA_PLATAFORMA[basename(dirname(resolve(carpeta)))] ?? "claude";

export function erroresAgente(ruta, plataforma = plataformaDe(dirname(ruta))) {
  return ruta.endsWith(".toml") ? erroresAgenteToml(ruta) : erroresAgenteMd(ruta, plataforma);
}

const huellaDe = (t) => createHash("sha256").update(t.replace(HUELLA, "huella: -"), "utf8").digest("hex");

export function sellar(ruta) {
  const t = texto(ruta);
  const huella = huellaDe(t);
  writeFileSync(ruta, t.replace(HUELLA, `huella: ${huella}`), "utf8");
  return huella;
}

export function editado(ruta) {
  const t = texto(ruta);
  const actual = t.match(/huella: ([0-9a-f]{64}|-)/);
  return !actual || actual[1] !== huellaDe(t);
}

export function revisar(carpeta, modo) {
  const extensiones = modo === "agentes" ? [".md", ".toml"] : [".md"];
  let archivos = readdirSync(carpeta)
    .filter((n) => extensiones.some((e) => n.endsWith(e)) && !NO_AGENTES.has(n))
    .sort()
    .map((n) => join(carpeta, n));
  const lineas = [];
  if (modo === "agentes") {
    // Los agentes propios del usuario no son del equipo: no se validan ni se tocan.
    const ajenos = archivos.filter((a) => !texto(a).includes(FIRMA));
    for (const a of ajenos) lineas.push(`${basename(a)}: ignorado (no lo generó equipo-tecnico)`);
    archivos = archivos.filter((a) => !ajenos.includes(a));
  }
  if (archivos.length === 0) return { codigo: 1, lineas: [...lineas, `${carpeta}: no hay agentes ni plantillas`] };
  const plataforma = plataformaDe(carpeta);
  const funcion = modo === "agentes" ? (a) => erroresAgente(a, plataforma) : erroresPlantilla;
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
