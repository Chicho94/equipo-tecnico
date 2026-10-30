#!/usr/bin/env node
// Genera un agente del equipo a partir de su plantilla, en el formato de la herramienta que se use.
//
// Uso:
//   node generar.mjs <rol> --para claude|codex|gemini|kimi --datos datos.json --proyecto <carpeta> [--comunicacion si|no]
//
// datos.json: { "PROYECTO", "STACK", "CARPETAS", "CARPETAS_PROHIBIDAS", "COMANDOS", "LINEAMIENTOS",
//               "PUNTOS_CRITICOS", "FECHA", "modelos": { "alto", "medio", "bajo" } (opcional; obligatorio en Codex) }
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { herramientasDe, nombreArchivo, PLATAFORMAS, ROLES } from "./plataformas.mjs";
import { leerAgente, sellar } from "./validar.mjs";

const PLANTILLAS = join(dirname(fileURLToPath(import.meta.url)), "..", "plantillas");

function rellenar(texto, datos) {
  return texto.replace(/\{\{([A-Z_]+)\}\}/g, (marcador, clave) => {
    const valor = datos[clave];
    if (valor === undefined || valor === null || String(valor).trim() === "")
      throw new Error(`Falta el dato ${clave} para rellenar ${marcador}`);
    return String(valor);
  });
}

function modeloDe(rol, plataforma, datos) {
  const p = PLATAFORMAS[plataforma];
  const nivel = ROLES[rol].nivel;
  // "modelos" puede venir por herramienta ({ "codex": {…} }) o plano ({ "alto": … }) para un proyecto de una sola herramienta.
  const porHerramienta = datos.modelos?.[plataforma];
  const elegido = porHerramienta ? porHerramienta[nivel] : datos.modelos?.[nivel];
  if (elegido) return elegido;
  if (p.modelos === "requeridos")
    throw new Error(`En ${p.nombre} hay que definir los modelos por nivel en datos.json ("modelos": { "alto", "medio", "bajo" }); falta "${nivel}".`);
  return p.modelos?.[nivel] ?? null;
}

const COMUNICACION = `## Comunicación con el equipo
Puedes consultar a otro rol del equipo cuando necesites su criterio (por ejemplo, al architect por una duda de diseño). Pídele opinión, no trabajo: nunca le pidas que toque tu territorio ni toques el suyo, y menciona cada consulta en tu entrega.`;

const lista = (items) => `[${items.join(", ")}]`;
const tomlTexto = (s) => JSON.stringify(s);
const tomlMultilinea = (s) => s.replace(/\\/g, "\\\\").replace(/"""/g, '""\\"');

export function generar({ rol, plataforma, datos, proyecto, comunicacion = false }) {
  if (!(rol in ROLES)) throw new Error(`Rol desconocido: ${rol}`);
  const p = PLATAFORMAS[plataforma];
  if (!p) throw new Error(`Plataforma desconocida: ${plataforma} (usa claude, codex, gemini o kimi)`);

  const [meta, cuerpoPlantilla] = leerAgente(join(PLANTILLAS, `${rol}.md`));
  // La primera línea del cuerpo de la plantilla es su marca: se reemplaza por la del agente generado.
  let cuerpo = rellenar(cuerpoPlantilla.replace(/^\s*<!-- equipo-tecnico[^\n]*\n/, ""), datos).trim();
  if (comunicacion && p.comunicacion) cuerpo = cuerpo.replace("## Entrega", `${COMUNICACION}\n\n## Entrega`);
  const descripcion = rellenar(meta.description, datos);
  const modelo = modeloDe(rol, plataforma, datos);
  const marca = `equipo-tecnico · plantilla: ${rol} · fecha: ${rellenar("{{FECHA}}", datos)} · comunicacion: ${comunicacion && p.comunicacion ? "si" : "no"} · huella: -`;
  const notas = [];

  let texto;
  if (p.formato === "toml") {
    const nivel = ROLES[rol].nivel;
    texto = [
      `# ${marca}`,
      `name = ${tomlTexto(rol.replace(/-/g, "_"))}`,
      `description = ${tomlTexto(descripcion)}`,
      `model = ${tomlTexto(modelo)}`,
      `model_reasoning_effort = ${tomlTexto(p.esfuerzo[nivel])}`,
      `developer_instructions = """`,
      tomlMultilinea(cuerpo),
      `"""`,
    ];
    if (!ROLES[rol].tools.includes("Bash")) texto.push("", "[features]", "shell_tool = false");
    if (!ROLES[rol].tools.includes("Write") && !ROLES[rol].tools.includes("Edit"))
      notas.push(`En ${p.nombre} no se puede dejar a ${rol} en solo lectura: su límite depende de sus instrucciones y de la revisión de territorio del director.`);
    texto = texto.join("\n") + "\n";
  } else {
    const tools = herramientasDe(rol, plataforma, comunicacion);
    const cabecera = [`name: ${rol}`, `description: ${JSON.stringify(descripcion)}`, `tools: ${p.lista ? lista(tools) : tools.join(", ")}`];
    if (modelo) cabecera.push(`model: ${modelo}`);
    if (p.claves.includes("color")) cabecera.push(`color: ${ROLES[rol].color}`);
    texto = `---\n${cabecera.join("\n")}\n---\n<!-- ${marca} -->\n\n${cuerpo}\n`;
  }

  if (!modelo) notas.push(`${p.nombre} no permite elegir modelo por agente: ${rol} usará el modelo de la sesión.`);
  if (comunicacion && !p.comunicacion)
    notas.push(`En ${p.nombre} un agente no puede llamar a otro: la comunicación entre agentes pasa por el director.`);
  if (comunicacion && p.comunicacion === "max_depth")
    notas.push(`Para que los agentes se comuniquen en ${p.nombre}, el proyecto necesita [agents] max_depth = 2 en .codex/config.toml.`);

  const ruta = join(resolve(proyecto), ...p.agentes, nombreArchivo(rol, plataforma));
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, texto, "utf8");
  sellar(ruta);
  return { ruta, notas };
}

function main(argv) {
  const rol = argv[0];
  const opcion = (nombre) => {
    const i = argv.indexOf(`--${nombre}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  const plataforma = opcion("para") ?? "claude";
  const archivoDatos = opcion("datos");
  const proyecto = opcion("proyecto") ?? ".";
  if (!rol || !archivoDatos) {
    console.log("Uso: node generar.mjs <rol> --para claude|codex|gemini|kimi --datos datos.json --proyecto <carpeta> [--comunicacion si|no]");
    return 2;
  }
  try {
    const datos = JSON.parse(readFileSync(archivoDatos, "utf8"));
    const { ruta, notas } = generar({ rol, plataforma, datos, proyecto, comunicacion: opcion("comunicacion") === "si" });
    console.log(ruta);
    for (const n of notas) console.log(`Nota: ${n}`);
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
