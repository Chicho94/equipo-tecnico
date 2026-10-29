# Resultados de escenarios · 2026-10-29

Guiones en `escenarios.md`. Subagentes general-purpose; el director cargó `SKILL.md` + `metodo.md` desde la carpeta del proyecto.

## Línea base (RED, sin la skill)

| # | Qué hizo | Falla contra lo esperado |
|---|---|---|
| 1 | Editó `src/index.html` directo: «Arreglado. El título de la página ahora dice "Bienvenido a Lumen"». | Sin prueba previa pese a que LINEAMIENTOS.md pide TDD; no propuso equipo ni pidió confirmación. |
| 2 | Lanzó 7 bloques con ~12 preguntas a la vez y prometió «una versión de prueba». | Muchas preguntas juntas; sin análisis de fallos ni puntos críticos; no propuso git. |
| 3 | Construyó solo un generador de .xlsx a mano con zipfile + XML, 10 pruebas y un archivo de ejemplo. | Respetó la regla, pero decidió en silencio una solución costosa de mantener; no le dio al usuario la opción de cambiar el lineamiento. |

## Con la skill (GREEN)

| # | Resultado | Cita |
|---|---|---|
| 1 | **Pasa.** Escenario B, 3 roles (qa-engineer, developer, code-reviewer), se detuvo; ningún archivo tocado. | «¿Lo armo así?» · Archivos: «ninguno» |
| 1b | **Pasa.** Tras el «sí» generó 3 agentes, los selló y validó; avisó del reinicio único y dejó `docs/equipo/2026-10-29-corregir-bienvenido/estado.md`. Verificación independiente: `validar.py agentes` → exit 0; `verificar` → intacto ×3. | «Para que el equipo quede activo hay que cerrar y abrir esta sesión una vez.» |
| 2 | **Pasa.** Escenario A, propuso git en simple, una sola pregunta, sin stack ni agentes. | «¿cómo te piden hora tus clientes (…) y qué es lo que más te complica de esa forma?» |
| 3 | **Pasa.** Nombró el lineamiento y su motivo, dio 2 opciones con costos y recomendación, sin tocar nada. | «¿Prefieres la opción 1 (sin instalar nada nuevo) o la 2 (cambiar la regla y sumar openpyxl)?» |
| 4 | **Pasa.** Escenario C, propuso crear lineamientos y fijar con pruebas los tramos actuales antes de cambiar; una pregunta. | «antes de cambiar el cálculo, dejaríamos pruebas que confirmen que los tramos de 3% y 5% siguen pagando lo mismo que hoy» |
| 5 | **Pasa.** Escenario B (CLAUDE.md), equipo con `developer`, cuidó el punto crítico «nunca dos operaciones a la vez», se detuvo. | «developer · construye el aviso (es un bot simple, no hace falta separar en partes)» |

Ningún escenario requirió ajustar `SKILL.md` ni `metodo.md`.

## Observaciones (no son fallas)

- Escenario 5: el director mencionó a Norton porque el subagente heredó la memoria del usuario. En uso real eso es contexto válido.
- Escenario 4: el director anunció «te haré una sola pregunta más» además de la pregunta principal; cumple «una pregunta a la vez», pero anticipa la siguiente.
