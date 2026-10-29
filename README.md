# equipo-tecnico

Skill de Claude Code para que una persona no técnica (el *product owner*) construya o cambie software con un equipo de agentes de IA. La conversación principal hace de **director**: entiende el pedido, propone el equipo justo, lo genera desde plantillas cuando el usuario dice «sí» y coordina el trabajo con TDD.

## Instalar

```
python instalar.py
```

Copia `SKILL.md`, `metodo.md`, `plantillas/` y `scripts/` a `~/.claude/skills/equipo-tecnico/`, reemplazando la versión anterior. Después, abre una sesión nueva de Claude Code.

## Usar

En cualquier proyecto escribe `/equipo-tecnico` y cuenta lo que necesitas. También se activa sola cuando pides construir o cambiar un sistema sin entrar en lo técnico.

## Estructura

| Ruta | Qué es |
|---|---|
| `SKILL.md` | El director: cómo arma y dirige al equipo |
| `metodo.md` | El método (escenarios A/B/C, análisis de fallos, TDD, comunicación) |
| `plantillas/` | Un agente por rol, con marcadores `{{...}}`, más la plantilla de lineamientos |
| `scripts/validar.py` | Valida plantillas y agentes generados; sella y verifica la huella de edición manual |
| `pruebas/` | Escenarios de comportamiento y sus resultados |
| `docs/` | Diseño y plan de construcción |

## Probar

```
python -m unittest discover tests
```

Los cambios en `SKILL.md`, `metodo.md` o las plantillas se vuelven a probar con los escenarios de `pruebas/escenarios.md`.
