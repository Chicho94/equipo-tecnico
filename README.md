# equipo-tecnico

Skill de Claude Code para que una persona no técnica (el *product owner*) construya o cambie software con un equipo de agentes de IA. La conversación principal hace de **director**: entiende el pedido, propone el equipo justo, lo genera desde plantillas cuando el usuario dice «sí» y coordina el trabajo con TDD.

## Instalar

Solo necesitas [Node.js](https://nodejs.org) 18 o superior.

```
npx equipo-tecnico install
```

Detecta qué herramientas tienes (Claude Code, Codex, Gemini CLI, Kimi Code) e instala la skill en todas ellas. Si no encuentra ninguna, la instala para las cuatro. Después, abre una sesión nueva de tu herramienta.

Para desinstalarla de todas partes:

```
npx equipo-tecnico uninstall
```

### Una sola herramienta y diferencias entre ellas

Si quieres instalarla solo en una herramienta:

```
npx equipo-tecnico install --para claude    (o codex, gemini, kimi, todas)
```

| | Claude Code | Codex | Gemini CLI | Kimi Code |
|---|---|---|---|---|
| Dónde se instala la skill | `~/.claude/skills/` | `~/.agents/skills/` | `~/.gemini/skills/` | `~/.agents/skills/` |
| Dónde quedan los agentes | `.claude/agents/` | `.codex/agents/` (`.toml`) | `.gemini/agents/` | `.kimi-code/agents/` |
| Modelo propio por agente | Sí | Sí (lo eliges tú) | Sí | No: usa el de la sesión |
| Revisor sin poder editar | Sí | No: solo por instrucciones | Sí | Sí |
| Agentes que se consultan entre sí | Sí | Sí (`max_depth = 2`) | No: pasa por el director | Sí |

Cada agente trabaja con **su propio modelo**, nunca con el del director: alto para architect y code-reviewer, bajo para tech-writer y medio para el resto. La tabla de diferencias vive en `scripts/plataformas.mjs`. Si alguna herramienta cambia un nombre o una carpeta, se corrige ahí.

## Usar

En cualquier proyecto escribe `/equipo-tecnico` y cuenta lo que necesitas. También se activa sola cuando pides construir o cambiar un sistema sin entrar en lo técnico.

Qué hace según el proyecto:
- **Sistema nuevo:** conversa contigo, analiza dónde podría fallar la idea y arma el equipo en dos tandas (primero diseño, después construcción).
- **Proyecto en curso:** lee su documentación; si no tiene, lee el proyecto mismo. Te cuenta «lo que entendió» (marcando lo que supone) y, en el mismo mensaje, te propone el equipo que encaja con lo que vio.
- **Siempre:** te muestra el equipo y espera tu «sí» antes de crear ningún agente.

## Roles posibles

product-analyst · architect · qa-engineer · backend-dev · frontend-dev · developer · devops-engineer · code-reviewer · tech-writer. El director elige solo los que el trabajo necesita.

## Estructura

| Ruta | Qué es |
|---|---|
| `SKILL.md` | El director: cómo arma y dirige al equipo |
| `metodo.md` | El método (escenarios A/B/C, análisis de fallos, TDD, comunicación) |
| `plantillas/` | Un agente por rol, con marcadores `{{...}}`, más la plantilla de lineamientos |
| `scripts/validar.mjs` | Valida plantillas y agentes generados (las 4 herramientas); sella y verifica la huella de edición manual |
| `scripts/generar.mjs` | Genera cada agente desde su plantilla, en el formato de la herramienta |
| `scripts/plataformas.mjs` | Diferencias entre herramientas: carpetas, nombres de herramientas, modelos |
| `bin/cli.mjs` | El comando `npx equipo-tecnico install / uninstall` |
| `pruebas/` | Escenarios de comportamiento y sus resultados (no viajan en el paquete) |
| `docs/` | Diseño y plan de construcción (no viajan en el paquete) |

## Probar

```
npm test
```

Los cambios en `SKILL.md`, `metodo.md` o las plantillas se vuelven a probar con los escenarios de `pruebas/escenarios.md`.
