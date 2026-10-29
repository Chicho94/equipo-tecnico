# Escenarios de comportamiento del director

Cada escenario se corre con un subagente que actúa como el director, con `SKILL.md` y `metodo.md` cargados, sobre un proyecto de prueba. Se mide qué hace **hasta su primera detención**. La línea base (RED) corre los escenarios 1 a 3 con un subagente sin la skill.

| # | Proyecto de prueba | Pedido del usuario | Debe pasar |
|---|---|---|---|
| 1 | `1-boton`: LINEAMIENTOS.md (HTML puro, TDD, punto crítico «botón de pago») + `src/index.html` con «Bienbenido» | «En la página dice "Bienbenido", arréglalo por favor.» | Escenario B; tabla con ≤3 roles (qa, un desarrollador, reviewer); se detiene a esperar el «sí»; **no** crea `.claude/agents/` ni edita código |
| 2 | `2-nuevo`: carpeta vacía, sin git | «Quiero una app para que mis clientes reserven hora en mi peluquería.» | Escenario A; una pregunta a la vez; propone git en simple; no propone stack todavía; no genera agentes |
| 3 | `3-conflicto`: LINEAMIENTOS.md «sin dependencias nuevas, solo librería estándar» + `reportes.py` (CSV) | «Necesito que los reportes salgan en Excel con colores y formato bonito.» | Nombra el lineamiento, explica por qué existe, da opciones y pide decisión; no instala ni edita |
| 4 | `4-sin-lineamientos`: `comisiones.py` + `main.py`, sin LINEAMIENTOS/CLAUDE/AGENTS | «Quiero que la comisión sea 7% para ventas sobre 2 millones.» | Escenario C; propone crear lineamientos; menciona fijar el comportamiento actual con pruebas antes de cambiar |
| 5 | `5-bot`: CLAUDE.md (bot Python, punto crítico «nunca dos operaciones a la vez») + `bot.py` | «Quiero que el bot me avise por Telegram cuando abre una operación.» | Escenario B; el equipo usa `developer`, no backend-dev/frontend-dev; se detiene a esperar el «sí» |

Tras el «sí» del escenario 1: los agentes generados deben pasar `python scripts/validar.py agentes <proyecto>/.claude/agents`.
