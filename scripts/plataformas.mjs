// Fuente única de las diferencias entre herramientas (Claude Code, Codex, Gemini CLI, Kimi Code).
// Si una herramienta cambia un nombre o una carpeta, se corrige aquí y en ningún otro lugar.
// Fuentes (oct-2026): docs de subagentes de Codex, Gemini CLI y Kimi Code; formato SKILL.md común.
import { homedir } from "node:os";
import { join } from "node:path";

const ESCRIBE = ["Read", "Write", "Edit", "Grep", "Glob", "Bash"];

// Roles con sus herramientas en nombres de Claude Code (las plantillas se escriben en ese formato).
export const ROLES = {
  "product-analyst": { tools: ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Write"], model: "sonnet", color: "blue", nivel: "medio" },
  architect: { tools: ["Read", "Grep", "Glob", "Bash", "Write"], model: "opus", color: "cyan", nivel: "alto" },
  "qa-engineer": { tools: ESCRIBE, model: "sonnet", color: "orange", nivel: "medio" },
  "backend-dev": { tools: ESCRIBE, model: "sonnet", color: "green", nivel: "medio" },
  "frontend-dev": { tools: ESCRIBE, model: "sonnet", color: "yellow", nivel: "medio" },
  developer: { tools: ESCRIBE, model: "sonnet", color: "green", nivel: "medio" },
  "devops-engineer": { tools: ESCRIBE, model: "sonnet", color: "purple", nivel: "medio" },
  "code-reviewer": { tools: ["Read", "Grep", "Glob", "Bash"], model: "opus", color: "red", nivel: "alto" },
  "tech-writer": { tools: ["Read", "Write", "Edit", "Grep", "Glob"], model: "haiku", color: "pink", nivel: "bajo" },
};

// Nombres de herramientas de Gemini CLI. Tomados de ejemplos de su documentación: verificar si alguno no coincide.
const GEMINI = {
  Read: ["read_file", "read_many_files", "list_directory"],
  Grep: ["grep_search"],
  Glob: ["glob"],
  Write: ["write_file"],
  Edit: ["replace"],
  Bash: ["run_shell_command"],
  WebSearch: ["google_web_search"],
  WebFetch: ["web_fetch"],
};

const config = (variable, carpeta) => process.env[variable] || join(homedir(), carpeta);

export const PLATAFORMAS = {
  claude: {
    nombre: "Claude Code",
    agentes: [".claude", "agents"],
    formato: "md",
    modelos: { alto: "opus", medio: "sonnet", bajo: "haiku" },
    herramientas: (tools) => tools,
    claves: ["name", "description", "tools", "model", "color"],
    comunicacion: "Agent",
    instalada: () => config("CLAUDE_CONFIG_DIR", ".claude"),
    skills: () => join(config("CLAUDE_CONFIG_DIR", ".claude"), "skills"),
  },
  gemini: {
    nombre: "Gemini CLI",
    agentes: [".gemini", "agents"],
    formato: "md",
    modelos: { alto: "pro", medio: "flash", bajo: "flash-lite" },
    herramientas: (tools) => tools.flatMap((t) => GEMINI[t] ?? []),
    lista: true,
    claves: ["name", "description", "tools", "model"],
    comunicacion: null,
    instalada: () => config("GEMINI_CLI_HOME", ".gemini"),
    skills: () => join(config("GEMINI_CLI_HOME", ".gemini"), "skills"),
  },
  kimi: {
    nombre: "Kimi Code",
    agentes: [".kimi-code", "agents"],
    formato: "md",
    modelos: null, // Kimi Code ignora el modelo por agente.
    herramientas: (tools) => tools,
    lista: true,
    claves: ["name", "description", "tools"],
    comunicacion: "Agent",
    instalada: () => config("KIMI_CODE_HOME", ".kimi-code"),
    skills: () => join(homedir(), ".agents", "skills"),
  },
  codex: {
    nombre: "Codex",
    agentes: [".codex", "agents"],
    formato: "toml",
    modelos: "requeridos", // Codex no trae una escala conocida: el usuario elige el modelo de cada nivel.
    esfuerzo: { alto: "high", medio: "medium", bajo: "low" },
    comunicacion: "max_depth",
    instalada: () => config("CODEX_HOME", ".codex"),
    skills: () => join(homedir(), ".agents", "skills"),
  },
};

export const CARPETA_PLATAFORMA = { ".claude": "claude", ".gemini": "gemini", ".kimi-code": "kimi", ".agents": "kimi", ".codex": "codex" };

// Herramientas que recibe un rol en una plataforma, con la de comunicación si el usuario la eligió.
export function herramientasDe(rol, plataforma, comunicacion) {
  const p = PLATAFORMAS[plataforma];
  const base = p.herramientas ? p.herramientas(ROLES[rol].tools) : [];
  return comunicacion && p.comunicacion === "Agent" ? [...base, "Agent"] : base;
}

export const nombreArchivo = (rol, plataforma) =>
  plataforma === "codex" ? `${rol.replace(/-/g, "_")}.toml` : `${rol}.md`;
