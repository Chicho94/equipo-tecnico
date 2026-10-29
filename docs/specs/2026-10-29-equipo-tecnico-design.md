# Diseño: skill «equipo-tecnico»

Fecha: 2026-10-29 · Estado: borrador para aprobación del usuario

## 1. Intención

Una skill de Claude Code para que una persona **no técnica**, que actúa como *product owner*, pueda construir o cambiar software con un equipo de agentes de IA. La persona decide **qué** se necesita y **por qué**; el equipo propone y ejecuta el **cómo**, y lo explica por su impacto (costo, riesgo, tiempo, datos personales), nunca por su tecnicismo.

El comportamiento esperado está en el documento del usuario `prompt-ia-socio-tecnico.md`, que esta skill convierte en un método repetible:
- Paso 0: identificar el escenario A (sistema nuevo), B (existente con lineamientos) o C (existente sin lineamientos).
- En A, asumir que la idea va a fallar: puntos débiles, fuertes y críticos, y una tabla «punto débil → protección → efecto en puntos fuertes».
- TDD por defecto, empezando por los puntos críticos.
- Un documento de lineamientos por proyecto.
- Reglas de comunicación, formato de propuesta y la lista «lo que nunca haces».

Los nueve archivos de ejemplo de DNCPlus (`architect.md`, `backend-dev.md`, etc.) son la referencia de forma y tono de los agentes. Su contenido específico de DNCPlus no se copia.

## 2. Por qué agentes generados

Son decisiones del usuario:
- **No rígidos.** El mismo rol se adapta a cada proyecto: el frontend-dev trabaja con React en uno y con HTML puro en otro. Por eso la skill trae **plantillas** y **genera** los agentes dentro del proyecto.
- **Independientes.** Los agentes no colaboran entre sí, para que ninguno cruce los límites de otro. Se comunican solo a través del director y de documentos del proyecto.
- **Paralelo cuando se puede.** El frontend y el backend trabajan a la vez. El code-reviewer y el tech-writer van al final, para no revisar ni documentar código que todavía puede cambiar.

## 3. Objetivos, no objetivos y antiobjetivos

**Objetivos**
- Detectar el escenario A, B o C y actuar según el documento del usuario.
- Proponer el equipo justo para el tamaño del trabajo, **mostrarlo y pedir confirmación antes de generarlo** (decisión del usuario).
- Generar los agentes adaptados al stack, las carpetas, los comandos y los lineamientos del proyecto.
- Coordinar el flujo con TDD real: las pruebas en rojo antes del código.
- Dejar el documento de lineamientos y el registro de decisiones al día.

**No objetivos**
- No reemplaza el criterio del *product owner* en reglas de negocio.
- No despliega a producción ni gasta dinero en la nube sin confirmación explícita.
- No es un gestor de tareas ni de tickets.

**Antiobjetivos** (fracaso aunque funcione):
- Que el usuario reciba jerga, preguntas en lista o decisiones técnicas sin explicar su impacto.
- Que se escriba código antes de la prueba que lo define.
- Que un agente edite fuera de su territorio.
- Que se generen nueve agentes para arreglar un botón.
- Que se den por terminados trabajos con pruebas fallando.

## 4. Piezas

```
~/.claude/skills/equipo-tecnico/          (skill global, sirve en cualquier proyecto)
├── SKILL.md                              el director (antes «tech-lead»)
├── metodo.md                             el documento del usuario, adaptado como referencia
└── plantillas/
    ├── product-analyst.md
    ├── architect.md
    ├── qa-engineer.md
    ├── backend-dev.md
    ├── frontend-dev.md
    ├── developer.md                      para proyectos sin división frente/fondo
    ├── devops-engineer.md
    ├── code-reviewer.md
    ├── tech-writer.md
    └── lineamientos.md                   plantilla del documento de lineamientos

<proyecto del usuario>/
├── LINEAMIENTOS.md                       reglas del proyecto (escenarios A y C lo crean)
├── .claude/agents/*.md                   agentes generados
└── docs/equipo/<AAAA-MM-DD-tema>/        entregables de cada trabajo
    ├── requisitos.md                     product-analyst
    ├── diseno.md                         architect (incluye el contrato front/back)
    └── verificacion.md                   qa-engineer (criterio → prueba → resultado)
```

### 4.1 El director (`SKILL.md`)

Es la conversación principal y la única que habla con el usuario. Por eso el tech-lead **no** es un agente: un subagente no puede conversar con el *product owner*. El director:
1. Identifica el escenario con una sola pregunta simple si no está claro.
2. Conversa con el usuario (una pregunta a la vez) para entender la idea. En el escenario A, lleva el análisis de fallos con él e invita al usuario a agregar riesgos del negocio.
3. **Propone el equipo y pide confirmación** (formato en §6.1).
4. Genera los agentes aprobados y los lanza en orden, en paralelo cuando corresponde.
5. Lleva al usuario las preguntas abiertas que devuelven los agentes.
6. Informa en lenguaje simple tras cada etapa: Hecho / Pendiente / Riesgos / Decisiones que necesito de ti.
7. Nunca hace commit, push ni despliegue sin que el usuario lo pida.

### 4.2 Plantillas

Cada plantilla tiene una parte fija del rol (misión, reglas, entrega, «Resumen para el humano» de máx. 5 líneas) y huecos que el director rellena:
- nombre del proyecto;
- stack;
- carpetas que el agente puede tocar;
- comandos de prueba, tipos y lint;
- ruta de LINEAMIENTOS.md;
- puntos críticos registrados.

Cada agente generado lleva en su primera línea de cuerpo una marca «Generado por equipo-tecnico a partir de la plantilla X, fecha Y». Si el director va a regenerar un agente y detecta que alguien lo editó a mano, pregunta antes de sobrescribirlo.

## 5. Los roles

| Rol | Cuándo entra | Herramientas | Modelo | Territorio |
|---|---|---|---|---|
| product-analyst | Inicio, si la necesidad es nueva o ambigua | Read, Grep, Glob, WebSearch, WebFetch, Write (solo su entregable) | sonnet | Escribe solo `requisitos.md`. Convierte la conversación en ejemplos «Cuando… si… entonces…», incluidos ejemplos de fallo. Sus dudas van como «Preguntas abiertas» al director, nunca las inventa. |
| architect | Tras requisitos; siempre en A | Read, Grep, Glob, Bash (solo lectura), Write (solo `diseno.md`) | opus | Análisis de fallos (débiles con impacto y probabilidad, fuertes, críticos y su comportamiento ante fallo), arquitectura, tabla de protección, **contrato front/back**, lista de archivos por desarrollador, orden y riesgos. No toca código. |
| qa-engineer | **Dos momentos:** antes de implementar (pruebas en rojo, primero las de puntos críticos) y después (ejecutar, verificar, reportar) | Read, Write, Edit, Grep, Glob, Bash | sonnet | Solo archivos de prueba y `verificacion.md`. Escribe las **pruebas de comportamiento**. No modifica código de producción; un defecto se reporta al director indicando qué agente debe corregirlo. |
| backend-dev | Tras las pruebas en rojo | Read, Write, Edit, Grep, Glob, Bash | sonnet | Solo las carpetas de backend. Implementa lo mínimo para pasar a verde y luego ordena. Escribe solo pruebas de piezas internas. |
| frontend-dev | Tras las pruebas en rojo, **en paralelo** con backend | Igual que backend | sonnet | Solo las carpetas de frontend. Mismas reglas. |
| devops-engineer | Cuando hay infraestructura, despliegue, costos o respaldos | Read, Write, Edit, Grep, Glob, Bash | sonnet | Infraestructura y build. **Se detiene y pide confirmación** antes de cualquier acción destructiva, con costo o en la nube. Explica costos y riesgos en simple. |
| code-reviewer | **Al final**, solo con las pruebas en verde | Read, Grep, Glob, Bash (solo lectura) | opus | Revisa el diff contra lineamientos, puntos críticos, seguridad y datos personales. Hallazgos por severidad con `archivo:línea`. Veredicto: Aprobado / Aprobado con cambios / Rechazado. No edita. |
| tech-writer | **Al final**, tras el veredicto del reviewer | Read, Write, Edit, Grep, Glob | haiku | Solo documentación: LINEAMIENTOS.md, registro de decisiones, README. Documenta lo que existe, de forma justa y sin sobredocumentar. |

| developer | En lugar de backend-dev y frontend-dev cuando el proyecto no se divide en frente y fondo (un script, una herramienta de consola, un bot, una página estática) | Igual que backend | sonnet | Las carpetas de código que defina el architect. Mismas reglas. |

**Paralelo sin copias aisladas** (decisión mía). backend-dev y frontend-dev trabajan a la vez en la misma carpeta, y eso solo se permite si sus territorios no se tocan. Lo compartido (por ejemplo, esquemas de validación) lo hace primero un solo agente, asignado por el architect, y recién después arrancan los dos en paralelo. Así no hacen falta ramas, commits internos ni fusiones, y se respeta la regla de no hacer commit sin que el usuario lo pida.

**Cómo se hacen cumplir los territorios** (decisión mía), en tres capas:
1. Las herramientas: quien no debe editar no recibe Write ni Edit.
2. Las reglas escritas en cada agente.
3. Después de cada etapa, el director revisa qué archivos cambiaron (con git si existe; si no, comparando la lista de archivos con sus fechas). Si un agente tocó algo fuera de su territorio, lo informa al usuario y lo devuelve al agente que corresponde.

Los bloqueos automáticos por ruta (hooks) quedan para una versión posterior, solo si en la práctica se ven infracciones.

## 6. Flujo

### 6.1 Propuesta de equipo (siempre, antes de generar)

El director muestra una tabla corta: rol, para qué, si entra o no y por qué, y el orden. Ejemplo:

> **Equipo que propongo para «agregar exportar a Excel»**
> | Rol | Para qué | |
> |---|---|---|
> | qa-engineer | prueba «cuando exporto con filtros, el archivo trae solo lo filtrado» | entra |
> | backend-dev | generar el archivo | entra |
> | code-reviewer | revisar al final | entra |
> | architect | no hace falta: no cambia la estructura | no entra |
> ¿Lo armo así?

Tamaños orientativos (decisión mía, ajustable por el director según el caso):
- **Ajuste chico** (un error, un texto, un estilo): qa-engineer, un desarrollador y code-reviewer.
- **Funcionalidad**: lo anterior más product-analyst, architect y tech-writer.
- **Sistema nuevo o cambio grande**: todos, incluido devops-engineer.

El usuario puede quitar o agregar roles. Nada se genera sin su «sí».

### 6.2 Orden

```
Escenario A:
  director conversa + análisis de fallos con el usuario
  → 1ª tanda (sin stack): product-analyst → architect
  → el architect propone el stack con 2 o 3 opciones (costo, dependencia de proveedor,
    facilidad de relevo) y su recomendación
  → usuario aprueba stack, diseño y ejemplos «Cuando… si… entonces…» (el contrato)
  → director crea LINEAMIENTOS.md
  → 2ª tanda (con el stack elegido): devops-engineer arma el esqueleto vacío del
    proyecto con el ejecutor de pruebas, tipos y lint funcionando (si no hay devops
    en el equipo, lo hace el desarrollador). Recién ahí el director rellena los
    comandos en las plantillas.
  → qa-engineer (rojo)
  → backend-dev ∥ frontend-dev (verde + ordenar)
  → qa-engineer (verificación)
  → code-reviewer → tech-writer

Cómo se distingue B de C: hay lineamientos si existe LINEAMIENTOS.md, o un CLAUDE.md
  o AGENTS.md con reglas del proyecto. Se leen tal como están. Si no hay
  LINEAMIENTOS.md, el director ofrece una vez crearlo apuntando a esos archivos, sin
  forzarlo. Un README solo no cuenta.

Escenario B: el director lee los lineamientos completos y genera de una vez a los
  necesarios. Si el pedido contradice un lineamiento, lo explica y el usuario decide.
  El architect revisa en versión acotada si el cambio toca un punto crítico, y lo
  avisa explícitamente antes de avanzar.

Escenario C: el director propone crear LINEAMIENTOS.md. Lo arma a partir de lo que
  observa en el sistema, y el usuario valida la parte de negocio. Antes de cambiar
  nada, el qa-engineer escribe pruebas que fijan el comportamiento actual. Si el
  usuario no quiere el documento, se avisa una vez del riesgo y se registran los
  supuestos al final.
```

Si la verificación falla, el director devuelve el defecto al desarrollador indicado y repite la verificación. El reviewer no entra hasta que todo esté en verde. Si el reviewer rechaza, se corrige y se vuelve a verificar antes de una nueva revisión.

### 6.3 Vida de los agentes entre trabajos

- Los agentes generados **quedan en el proyecto** y se reutilizan en los trabajos siguientes.
- Tener un agente en la carpeta no significa usarlo: en cada trabajo el director **lanza solo a los del equipo aprobado**. Los demás quedan quietos y no cuestan nada.
- Un agente se regenera solo cuando cambia algo que lleva adentro (stack, carpetas, comandos, lineamientos, puntos críticos). Antes de hacerlo, el director revisa la marca de edición manual (§4.2).

### 6.4 Reinicio único

Claude Code detecta en segundos los agentes nuevos o editados, **salvo** cuando crea por primera vez la carpeta `.claude/agents/` de un proyecto: ahí hay que reiniciar la sesión una vez. El director lo avisa en simple, deja anotado en `docs/equipo/<tema>/` dónde iba, y retoma desde ahí al volver.

## 7. Comunicación (aplica al director y a los «Resumen para el humano»)

Se toma tal cual del documento del usuario:
- lenguaje simple;
- una pregunta a la vez;
- 2 o 3 opciones con recomendación;
- honestidad con los límites;
- avisar problemas cercanos;
- explicar TDD una sola vez si el usuario no lo conoce;
- nunca ocultar errores propios.

## 8. Restricciones

- Claude Code en Windows y en otros sistemas: las plantillas no asumen un sistema operativo.
- La skill se instala de forma global (`~/.claude/skills/`) para usarla en cualquier proyecto.
- Un subagente no puede hacerle preguntas al usuario a mitad de su trabajo. Toda duda vuelve al director.
- Los subagentes sí pueden lanzar otros subagentes, pero **las plantillas no les dan la herramienta Agent**. La independencia es una decisión del usuario.

## 9. Decisiones tomadas por mí (revisables)

- Nombre `equipo-tecnico`; código fuente en `Desktop/proyectos/equipo-tecnico/`, instalado copiando a `~/.claude/skills/`.
- Entregables por trabajo en `docs/equipo/<fecha-tema>/`, y lineamientos en `LINEAMIENTOS.md` en la raíz.
- Tamaños de equipo orientativos (§6.1).
- Reparto de pruebas: el qa-engineer escribe las de comportamiento y los desarrolladores solo las internas.
- Modelos por rol tomados de los ejemplos de DNCPlus.
- Un rol extra, `developer`, para proyectos que no se dividen en frente y fondo.
- Paralelo en la misma carpeta con territorios separados, sin copias aisladas ni commits internos.
- Territorios protegidos por herramientas, reglas y la revisión del director, sin hooks por ahora.
- El architect propone el stack y el usuario lo aprueba. El esqueleto del proyecto lo arma devops (o el desarrollador) antes de las pruebas.
- Los agentes quedan en el proyecto y se reutilizan; solo se lanzan los del equipo aprobado.
- B o C: LINEAMIENTOS.md, CLAUDE.md o AGENTS.md cuentan como lineamientos; un README solo, no.
- Si el proyecto no tiene git, el director propone crearlo (sirve para deshacer y para ver qué cambió), explicándolo en simple. Si el usuario no quiere, se sigue sin git.

## 10. Lo que queda al constructor

- La redacción exacta de SKILL.md y de las plantillas, siguiendo `superpowers:writing-skills`, con instrucciones cortas y sin relleno.
- El mecanismo de los huecos de las plantillas (marcadores `{{...}}` u otro).
- Cómo detectar el stack en los escenarios B y C (leer package.json, pyproject, etc.).
- Las pruebas de la skill: escenarios de conversación simulados para A, B y C, y para el ajuste chico.
