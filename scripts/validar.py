"""Valida plantillas y agentes generados por la skill equipo-tecnico.

Uso:
    python validar.py plantillas <carpeta>   revisa plantillas (marcadores permitidos)
    python validar.py agentes <carpeta>      revisa agentes generados
    python validar.py sellar <archivo>       escribe la huella del agente
    python validar.py verificar <archivo>    imprime «intacto» o «editado»
"""
import hashlib
import re
import sys
from pathlib import Path

_ESCRIBE = ["Read", "Write", "Edit", "Grep", "Glob", "Bash"]

# Fuente única de la tabla de roles del plan (restricciones globales).
ROLES = {
    "product-analyst": {"tools": ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Write"], "model": "sonnet", "color": "blue"},
    "architect": {"tools": ["Read", "Grep", "Glob", "Bash", "Write"], "model": "opus", "color": "cyan"},
    "qa-engineer": {"tools": _ESCRIBE, "model": "sonnet", "color": "orange"},
    "backend-dev": {"tools": _ESCRIBE, "model": "sonnet", "color": "green"},
    "frontend-dev": {"tools": _ESCRIBE, "model": "sonnet", "color": "yellow"},
    "developer": {"tools": _ESCRIBE, "model": "sonnet", "color": "green"},
    "devops-engineer": {"tools": _ESCRIBE, "model": "sonnet", "color": "purple"},
    "code-reviewer": {"tools": ["Read", "Grep", "Glob", "Bash"], "model": "opus", "color": "red"},
    "tech-writer": {"tools": ["Read", "Write", "Edit", "Grep", "Glob"], "model": "haiku", "color": "pink"},
}
COLORES = {"red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"}
NO_AGENTES = {"lineamientos.md"}
CLAVES = {"name", "description", "tools", "model", "color"}
FIRMA = "<!-- equipo-tecnico · plantilla:"
MARCA = re.compile(
    r"^<!-- equipo-tecnico · plantilla: (?P<rol>[a-z-]+) · fecha: \d{4}-\d{2}-\d{2}"
    r" · huella: (?P<huella>[0-9a-f]{64}|-) -->$"
)
_HUELLA = re.compile(r"huella: (?:[0-9a-f]{64}|-) -->")


def _texto(ruta: Path) -> str:
    return ruta.read_text(encoding="utf-8").replace("\r\n", "\n")


def leer_agente(ruta: Path) -> tuple[dict, str]:
    lineas = _texto(ruta).split("\n")
    if not lineas or lineas[0].strip() != "---":
        return {}, "\n".join(lineas)
    fin = next((i for i in range(1, len(lineas)) if lineas[i].strip() == "---"), None)
    if fin is None:
        return {}, "\n".join(lineas)
    meta = {}
    for linea in lineas[1:fin]:
        if ":" in linea:
            clave, valor = linea.split(":", 1)
            meta[clave.strip()] = valor.strip()
    return meta, "\n".join(lineas[fin + 1:])


def errores_plantilla(ruta: Path) -> list[str]:
    meta, cuerpo = leer_agente(ruta)
    if not meta:
        return ["sin frontmatter"]
    rol = meta.get("name", "")
    if rol not in ROLES:
        return [f"name «{rol}» no es un rol conocido"]
    esperado = ROLES[rol]
    errores = []
    tools = [t.strip() for t in meta.get("tools", "").split(",") if t.strip()]
    if "Agent" in tools:
        errores.append("tools incluye Agent: los agentes no lanzan a otros")
    if set(tools) != set(esperado["tools"]):
        errores.append(f"tools {tools} no coincide con {esperado['tools']}")
    if meta.get("model") != esperado["model"]:
        errores.append(f"model «{meta.get('model')}» debería ser «{esperado['model']}»")
    color = meta.get("color")
    if color not in COLORES or color != esperado["color"]:
        errores.append(f"color «{color}» debería ser «{esperado['color']}»")
    if not meta.get("description"):
        errores.append("falta description")
    for clave in sorted(set(meta) - CLAVES):
        errores.append(f"clave no permitida en el frontmatter: {clave}")
    if "## Entrega" not in cuerpo:
        errores.append("falta la sección «## Entrega»")
    if "Resumen para el humano" not in cuerpo:
        errores.append("falta «Resumen para el humano»")
    return errores


def errores_agente(ruta: Path) -> list[str]:
    errores = errores_plantilla(ruta)
    texto = _texto(ruta)
    for marcador in sorted(set(re.findall(r"\{\{[A-Z_]+\}\}", texto))):
        errores.append(f"marcador sin rellenar {marcador}")
    _, cuerpo = leer_agente(ruta)
    primera = next((l for l in cuerpo.split("\n") if l.strip()), "")
    if not MARCA.match(primera.strip()):
        errores.append("falta la marca de generación en la primera línea del cuerpo")
    return errores


def _huella_de(texto: str) -> str:
    neutro = _HUELLA.sub("huella: - -->", texto, count=1)
    return hashlib.sha256(neutro.encode("utf-8")).hexdigest()


def sellar(ruta: Path) -> str:
    texto = _texto(ruta)
    huella = _huella_de(texto)
    ruta.write_text(_HUELLA.sub(f"huella: {huella} -->", texto, count=1), encoding="utf-8", newline="\n")
    return huella


def editado(ruta: Path) -> bool:
    texto = _texto(ruta)
    actual = re.search(r"huella: ([0-9a-f]{64}|-) -->", texto)
    return actual is None or actual.group(1) != _huella_de(texto)


def _revisar(carpeta: Path, funcion) -> int:
    archivos = [a for a in sorted(carpeta.glob("*.md")) if a.name not in NO_AGENTES]
    if funcion is errores_agente:
        # Los agentes propios del usuario no son del equipo: no se validan ni se tocan.
        for ajeno in [a for a in archivos if FIRMA not in _texto(a)]:
            print(f"{ajeno.name}: ignorado (no lo generó equipo-tecnico)")
            archivos.remove(ajeno)
    if not archivos:
        print(f"{carpeta}: no hay archivos .md")
        return 1
    codigo = 0
    for archivo in archivos:
        for error in funcion(archivo):
            print(f"{archivo.name}: {error}")
            codigo = 1
    return codigo


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] not in {"plantillas", "agentes", "sellar", "verificar"}:
        print(__doc__)
        return 2
    accion, ruta = argv[0], Path(argv[1])
    if accion == "plantillas":
        return _revisar(ruta, errores_plantilla)
    if accion == "agentes":
        return _revisar(ruta, errores_agente)
    if accion == "sellar":
        print(sellar(ruta))
        return 0
    print("editado" if editado(ruta) else "intacto")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
