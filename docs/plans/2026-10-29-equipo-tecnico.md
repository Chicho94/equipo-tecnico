# Skill «equipo-tecnico»: plan de construcción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** construir una skill global de Claude Code. Su conversación principal hace de director con un *product owner* no técnico, propone un equipo de agentes, lo genera desde plantillas cuando el usuario lo confirma y coordina el trabajo con TDD.

**Arquitectura:**
- `SKILL.md` es el director.
- `plantillas/` contiene un `.md` por rol, con marcadores `{{...}}`.
- `scripts/validar.py`, hecho en Python estándar sin dependencias, valida plantillas y agentes generados, y sella o verifica una huella para detectar ediciones manuales.
- El comportamiento del director se prueba con escenarios simulados con subagentes, según superpowers:writing-skills.

**Tecnología:**
- Markdown con frontmatter YAML para los agentes de Claude Code.
- Python 3.13 con `unittest` (pytest no está instalado y no se agrega).

**Spec:** `docs/specs/2026-10-29-equipo-tecnico-design.md`. Fuentes que el spec cita:
- `C:\Users\cesid\OneDrive\Desktop\prompt-ia-socio-tecnico.md` (el método);
- `C:\Users\cesid\OneDrive\Desktop\agents\*.md` (los ejemplos de DNCPlus: forma y tono, sin copiar lo específico de DNCPlus).

## Restricciones globales

- Todo texto para el usuario y todos los agentes, en español.
- Ninguna plantilla incluye la herramienta `Agent` (spec §8).
- Frontmatter de cada agente: `name`, `description`, `tools`, `model`, `color`.
  - `color` solo puede ser: red, blue, green, yellow, purple, orange, pink, cyan. Gris no existe.
- Tabla de roles. Es la fuente única: `validar.py` la codifica en `ROLES`.

  | rol | tools | model | color | puede escribir |
  |---|---|---|---|---|
  | product-analyst | Read, Grep, Glob, WebSearch, WebFetch, Write | sonnet | blue | solo `docs/equipo/*/requisitos.md` |
  | architect | Read, Grep, Glob, Bash, Write | opus | cyan | solo `docs/equipo/*/diseno.md` |
  | qa-engineer | Read, Write, Edit, Grep, Glob, Bash | sonnet | orange | pruebas + `verificacion.md` |
  | backend-dev | Read, Write, Edit, Grep, Glob, Bash | sonnet | green | carpetas de backend |
  | frontend-dev | Read, Write, Edit, Grep, Glob, Bash | sonnet | yellow | carpetas de frontend |
  | developer | Read, Write, Edit, Grep, Glob, Bash | sonnet | green | carpetas que defina el architect |
  | devops-engineer | Read, Write, Edit, Grep, Glob, Bash | sonnet | purple | infraestructura y build |
  | code-reviewer | Read, Grep, Glob, Bash | opus | red | nada |
  | tech-writer | Read, Write, Edit, Grep, Glob | haiku | pink | solo documentación |

- Marcadores de plantilla:
  - `{{PROYECTO}}`, `{{STACK}}`, `{{CARPETAS}}`, `{{COMANDOS}}`, `{{LINEAMIENTOS}}`, `{{PUNTOS_CRITICOS}}`, `{{FECHA}}`.
  - Los desarrolladores pueden usar además `{{CARPETAS_PROHIBIDAS}}`.
- Primera línea del cuerpo de cada agente generado:
  `<!-- equipo-tecnico · plantilla: <rol> · fecha: <AAAA-MM-DD> · huella: <sha256> -->`
  - La huella es el sha256 del archivo completo, calculado con esa línea vacía de huella (`huella: -`).
- Cada plantilla termina con la sección `## Entrega` y un «Resumen para el humano» de máximo 5 líneas.
- Compatible con Windows: `pathlib`, UTF-8 explícito y sin comandos de shell en el script.

## Foco de revisión

1. **Un marcador sin rellenar en un agente generado.** `validar.py agentes` debe fallar y nombrar el marcador y el archivo (prueba en Tarea 1).
2. **Un rol de solo lectura con Write o Edit** (code-reviewer), o cualquier rol con `Agent`. La validación debe fallar (Tarea 1).
3. **Un agente editado a mano después de generado.** `verificar` debe responder «editado» (Tarea 1).
4. **El director genera agentes sin confirmación** en un ajuste chico. El escenario «botón» debe mostrar la tabla del equipo y detenerse a esperar el «sí» (Tarea 5).
5. **Un proyecto sin git o sin `.claude/agents/`.** El director propone `git init` en simple y avisa del reinicio único (escenario A, Tarea 5).

---

### Tarea 1: Repositorio y validador

**Archivos:**
- Crear: `scripts/validar.py`, `tests/test_validar.py`, `tests/fixtures/` (agentes de ejemplo buenos y malos), `.gitignore` (`__pycache__/`).
- Ya existe: `docs/specs/2026-10-29-equipo-tecnico-design.md` (entra en el primer commit).

**Interfaces que produce** (las usan las Tareas 2, 4 y 6):
- `ROLES: dict[str, dict]` con las claves `tools: list[str]`, `model: str`, `color: str` (los valores salen de la tabla de restricciones globales).
- `leer_agente(ruta: Path) -> tuple[dict, str]` devuelve `(frontmatter, cuerpo)`. Es un parser propio de `clave: valor` entre las líneas `---`, sin PyYAML.
- `errores_plantilla(ruta: Path) -> list[str]` revisa que:
  - el `name` esté en `ROLES`;
  - tools, model y color coincidan exactamente con `ROLES`;
  - no esté `Agent`;
  - exista `## Entrega`;
  - exista «Resumen para el humano».

  En una plantilla los marcadores están permitidos.
- `errores_agente(ruta: Path) -> list[str]`: lo mismo que la plantilla, más:
  - cero `{{`;
  - la primera línea del cuerpo cumple el formato de marca.
- `sellar(ruta: Path) -> str` escribe la huella y la devuelve.
- `editado(ruta: Path) -> bool` es `True` si la huella no coincide.
- CLI: `python scripts/validar.py plantillas <carpeta> | agentes <carpeta> | sellar <archivo> | verificar <archivo>`.
  - Devuelve 0 si todo está bien y 1 si hay errores, imprimiendo uno por línea como `archivo: mensaje`.
  - `verificar` imprime `intacto` o `editado`.

- [ ] **Paso 1:** `git init` en `Desktop/proyectos/equipo-tecnico/`. Copiar el método a `referencias/prompt-ia-socio-tecnico.md`. No copiar los ejemplos de DNCPlus: se consultan desde su ruta.
- [ ] **Paso 2: escribir las pruebas que fallan** en `tests/test_validar.py` (`unittest`):
  - `test_plantilla_valida_pasa`: la fixture `plantilla_ok.md` (rol code-reviewer, con marcadores) da `[]`.
  - `test_reviewer_con_write_falla`: `reviewer_con_write.md` da un error que contiene `"tools"`.
  - `test_agent_prohibido`: una fixture con `tools: Read, Agent` da un error que contiene `"Agent"`.
  - `test_color_gris_falla`: `color: gray` da un error que contiene `"color"`.
  - `test_agente_con_marcador_falla`: un agente con `{{STACK}}` da un error que contiene `"{{STACK}}"`.
  - `test_agente_sin_marca_falla`: un cuerpo sin la línea `<!-- equipo-tecnico` da un error que contiene `"marca"`.
  - `test_sellar_y_verificar`: `sellar` y luego `editado` da `False`; tras agregar una línea, da `True`.
  - `test_cli_codigo_salida`: `subprocess` con `agentes tests/fixtures/malos` da código 1, y con `.../buenos` da 0.
- [ ] **Paso 3:** `python -m unittest discover tests -v`. Esperado: FALLA (no existe `validar`).
- [ ] **Paso 4:** implementar `scripts/validar.py` con las interfaces de arriba.
- [ ] **Paso 5:** `python -m unittest discover tests -v`. Esperado: 8 pruebas OK.
- [ ] **Paso 6:** commit `feat: validador de plantillas y agentes`, que incluye el spec y este plan.

### Tarea 2: Plantillas de los 9 roles y de lineamientos

**Archivos:**
- Crear `plantillas/`, con un archivo por rol:
  - `product-analyst.md`, `architect.md`, `qa-engineer.md`;
  - `backend-dev.md`, `frontend-dev.md`, `developer.md`;
  - `devops-engineer.md`, `code-reviewer.md`, `tech-writer.md`.
- Crear `plantillas/lineamientos.md`, con la plantilla del final del método y la sección 6b. No es un agente, así que el validador la ignora por nombre.

**Interfaces:**
- **Consume:** `ROLES` y la CLI `plantillas` de la Tarea 1.
- **Produce:** los marcadores de las restricciones globales. Los usa la Tarea 4 para rellenar.

Contenido obligatorio por rol (spec §5, más el método):
- **product-analyst:**
  - convierte la conversación que le pasa el director en ejemplos «Cuando… si… entonces…», con ejemplos de fallo;
  - entrega: objetivo, ejemplos, fuera de alcance y «Preguntas abiertas para el director»;
  - nunca inventa reglas de negocio ni le pregunta al usuario.
- **architect:**
  - análisis de fallos: las 10 áreas del método A.2, cada punto débil con qué falla, cómo se nota, impacto y probabilidad;
  - puntos fuertes y puntos críticos, cada uno con su comportamiento ante fallo;
  - tabla «punto débil → protección → ¿afecta un punto fuerte?»;
  - en sistema nuevo, el stack con 2 o 3 opciones y una recomendación;
  - el contrato front/back;
  - archivos por desarrollador y orden de trabajo. Lo compartido lo asigna a un solo agente;
  - en el escenario B, la revisión acotada que avisa si se toca un punto crítico.
- **qa-engineer:**
  - **modo rojo:** pruebas de comportamiento desde los ejemplos, primero los puntos críticos y sus fallos; deben fallar;
  - **modo verificación:** ejecutar las pruebas y llenar la tabla criterio → prueba → resultado en `verificacion.md`;
  - en el escenario C, pruebas que fijan el comportamiento actual;
  - nunca toca código de producción.
- **backend-dev, frontend-dev y developer:**
  - solo trabajan dentro de `{{CARPETAS}}`;
  - rojo → verde → ordenar, con solo pruebas internas;
  - un defecto fuera de su territorio se reporta y no se arregla.
- **devops-engineer:**
  - arma el esqueleto con el ejecutor de pruebas, tipos y lint;
  - se detiene ante acciones destructivas, con costo o en la nube;
  - explica en simple los costos y riesgos.
- **code-reviewer:**
  - revisa el diff contra `{{LINEAMIENTOS}}` y `{{PUNTOS_CRITICOS}}`;
  - hallazgos por severidad con `archivo:línea`;
  - veredicto: Aprobado / Aprobado con cambios / Rechazado;
  - sin hallazgos inventados.
- **tech-writer:**
  - documenta lo que existe;
  - actualiza `{{LINEAMIENTOS}}` (registro de decisiones) y el README;
  - no sobredocumenta.

- [ ] **Paso 1:** `python scripts/validar.py plantillas plantillas`. Esperado: FALLA (la carpeta no existe o está vacía).
- [ ] **Paso 2:** escribir las 10 plantillas.
- [ ] **Paso 3:** `python scripts/validar.py plantillas plantillas`. Esperado: código 0, sin salida de errores.
- [ ] **Paso 4:** agregar `test_plantillas_reales_validas` a `tests/test_validar.py`. Recorre `plantillas/*.md` (menos `lineamientos.md`) y comprueba que hay 9 archivos y que cada uno da `[]`. Ejecutar `python -m unittest discover tests -v`: todo OK.
- [ ] **Paso 5:** commit `feat: plantillas de roles y lineamientos`.

### Tarea 3: `metodo.md`

**Archivos:** crear `metodo.md`.

Toma el documento del usuario y lo adapta como referencia del director:
- el Paso 0;
- el escenario A (A.1–A.6), B y C;
- la explicación de TDD para el usuario;
- la comunicación;
- el formato de propuesta (9 puntos);
- lo que nunca se hace.

Quita lo que ya está en las plantillas (el detalle de cada rol) y agrega una tabla «paso del método → rol que lo ejecuta» (spec §5).

- [ ] **Paso 1:** escribir `metodo.md`.
- [ ] **Paso 2:** comprobar que cada encabezado del método original (Paso 0, A.1–A.6, B, C, TDD, Cómo te comunicas, Formato, Lo que nunca haces) aparece o está remitido a una plantilla:
  ```
  python -c "import pathlib,sys; t=pathlib.Path('metodo.md').read_text(encoding='utf-8'); f=[h for h in ['Paso 0','A.1','A.2','A.3','A.4','A.5','A.6','Escenario B','Escenario C','TDD','comunicas','Formato','nunca'] if h not in t]; print(f); sys.exit(bool(f))"
  ```
  Esperado: `[]`.
- [ ] **Paso 3:** commit `docs: método adaptado para el director`.

### Tarea 4: `SKILL.md`, el director

**Archivos:** crear `SKILL.md`.

**Interfaces:** usa las plantillas (Tarea 2), `metodo.md` (Tarea 3) y la CLI de la Tarea 1, con la ruta relativa a la skill `scripts/validar.py`.

Frontmatter:
- `name: equipo-tecnico`;
- `description`: en español, que empiece con «Úsala cuando…». Debe disparar con pedidos de construir o cambiar software donde el usuario actúa como *product owner* no técnico, o cuando pide armar un equipo de agentes. Nombra solo los gatillos, no el flujo (regla de superpowers:writing-skills).

El cuerpo, conciso, debe cubrir estas secciones del spec:
1. **Rol:** es el director y el único que habla con el usuario. Reglas de comunicación según `metodo.md`.
2. **Paso 0:** detectar el escenario.
   - Hay lineamientos si existe `LINEAMIENTOS.md`, `CLAUDE.md` o `AGENTS.md`; un README solo no cuenta.
   - Si no hay git, proponer `git init` explicado en simple; si el usuario no quiere, se sigue sin git.
3. **Escenario A:** conversar, llevar el análisis de fallos con el usuario y luego proponer el equipo.
4. **Propuesta de equipo:** la tabla del spec §6.1 y los tamaños orientativos (ajuste chico / funcionalidad / sistema nuevo). **No generar nada sin el «sí».**
5. **Generar los agentes:**
   - rellenar la plantilla;
   - escribir en `<proyecto>/.claude/agents/<rol>.md`;
   - ejecutar `python <skill>/scripts/validar.py sellar` y luego `agentes`;
   - antes de regenerar, `verificar`. Si sale `editado`, preguntar al usuario.
   - Si la carpeta `.claude/agents/` no existía, avisar del reinicio único y anotar en `docs/equipo/<tema>/estado.md` dónde se iba.
6. **Orden por escenario:** el bloque del spec §6.2, con:
   - las dos tandas;
   - la aprobación del stack;
   - el esqueleto antes del rojo;
   - backend ∥ frontend solo si sus territorios no se tocan;
   - lo compartido primero;
   - el reviewer solo con todo en verde;
   - el writer al final.
7. **Revisión de territorio después de cada etapa:** `git status --porcelain`, o sin git, comparar la lista de archivos y sus fechas antes y después. Si un archivo quedó fuera del territorio, se informa y se devuelve al agente que corresponde.
8. **Informe por etapa:** Hecho / Pendiente / Riesgos / Decisiones que necesito de ti.
9. **Nunca:**
   - commit, push ni despliegue sin pedido;
   - dar algo por terminado con pruebas fallando;
   - lanzar agentes que no estén en el equipo aprobado.

- [ ] **Paso 1:** escribir `SKILL.md`.
- [ ] **Paso 2:** `python -c "import pathlib; t=pathlib.Path('SKILL.md').read_text(encoding='utf-8'); print(len(t.split()))"`. Esperado: menos de 1.500 palabras; si se pasa, mover detalle a `metodo.md`.
- [ ] **Paso 3:** commit `feat: director de la skill`.

### Tarea 5: Pruebas de comportamiento con escenarios (superpowers:writing-skills)

**Archivos:** crear `pruebas/escenarios.md` (los 5 guiones) y `pruebas/resultados-AAAA-MM-DD.md`.

Cada escenario usa un proyecto de prueba en el scratchpad y un subagente que actúa como director, con `SKILL.md` y `metodo.md` cargados. El que lanza la prueba hace de *product owner* con las respuestas guionizadas. Se mide qué hace el director **hasta su primera detención**.

| # | Escenario | Proyecto de prueba | Debe pasar |
|---|---|---|---|
| 1 | Botón | `LINEAMIENTOS.md` + `src/` con un HTML y un error de texto | Escenario B, tabla con ≤3 roles (qa, un desarrollador, reviewer), se detiene a esperar el «sí» y **no** crea archivos en `.claude/agents/` |
| 2 | Sistema nuevo | Carpeta vacía, sin git | Pide entender la idea con una pregunta a la vez, propone `git init` explicado en simple, y el análisis de fallos incluye puntos críticos. No propone stack antes de la 1ª tanda |
| 3 | Conflicto con lineamientos | `LINEAMIENTOS.md` que dice «sin dependencias nuevas»; el pedido exige una librería | Nombra el lineamiento, da las opciones y pide decisión. No avanza en silencio |
| 4 | Sin lineamientos | Proyecto Python con código y sin LINEAMIENTOS/CLAUDE/AGENTS | Escenario C, propone crear lineamientos y menciona las pruebas que fijan el comportamiento actual antes de cambiar |
| 5 | No web | Script de bot en Python, pedido de una función nueva | El equipo usa `developer`, no backend-dev ni frontend-dev |

- [ ] **Paso 1 (RED):** correr los escenarios 1 a 3 con un subagente **sin** la skill, solo con el pedido. Anotar en `resultados` lo que hace mal (por ejemplo: implementa directo o no pregunta).
- [ ] **Paso 2 (GREEN):** correr los 5 escenarios con la skill. Anotar pasa o falla con una cita textual de la respuesta.
- [ ] **Paso 3:** por cada falla, ajustar `SKILL.md` o `metodo.md` y repetir **solo** ese escenario hasta que pase.
- [ ] **Paso 4:** en el escenario 1, después del «sí» guionizado, comprobar que se generaron los agentes y que `python scripts/validar.py agentes <proyecto>/.claude/agents` da código 0.
- [ ] **Paso 5:** commit `test: escenarios de comportamiento del director`.

### Tarea 6: Instalación

**Archivos:** crear `instalar.py` y `README.md`. El README queda corto: qué es, cómo instalar y cómo usar (`/equipo-tecnico`).

**Interfaces:**
- `python instalar.py` copia `SKILL.md`, `metodo.md`, `plantillas/` y `scripts/` a `~/.claude/skills/equipo-tecnico/`. Es idempotente: reemplaza la carpeta destino. No copia `tests/`, `pruebas/`, `docs/` ni `referencias/`.
- Al terminar ejecuta `validar.py plantillas` sobre la copia instalada y devuelve ese código.

- [ ] **Paso 1:** agregar `test_instalar_en_carpeta_temporal` en `tests/test_instalar.py`. Llama a `instalar.instalar(destino: Path) -> int` con un `tempfile.TemporaryDirectory()` y comprueba:
  - que existen `SKILL.md`, `scripts/validar.py` y 10 archivos en `plantillas/`;
  - que no existe `tests/`;
  - que el retorno es 0.
- [ ] **Paso 2:** `python -m unittest discover tests -v`. Esperado: FALLA.
- [ ] **Paso 3:** implementar `instalar(destino: Path) -> int`. El destino por defecto es `Path.home() / ".claude/skills/equipo-tecnico"`.
- [ ] **Paso 4:** `python -m unittest discover tests -v`. Esperado: todo OK.
- [ ] **Paso 5:** `python instalar.py`. Abrir una sesión nueva y comprobar que `/equipo-tecnico` aparece en la lista de skills.
- [ ] **Paso 6:** commit `feat: instalador y README`.
