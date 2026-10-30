"""Instala la skill equipo-tecnico en ~/.claude/skills/equipo-tecnico (reemplaza la anterior)."""
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
ARCHIVOS = ["SKILL.md", "metodo.md"]
CARPETAS = ["plantillas", "scripts"]
DESTINO = Path.home() / ".claude" / "skills" / "equipo-tecnico"


def instalar(destino: Path = DESTINO) -> int:
    if destino.exists():
        shutil.rmtree(destino)
    destino.mkdir(parents=True)
    for nombre in ARCHIVOS:
        shutil.copy2(RAIZ / nombre, destino / nombre)
    for nombre in CARPETAS:
        shutil.copytree(RAIZ / nombre, destino / nombre, ignore=shutil.ignore_patterns("__pycache__"))
    sys.path.insert(0, str(destino / "scripts"))
    import validar
    return validar._revisar(destino / "plantillas", validar.errores_plantilla)


if __name__ == "__main__":
    codigo = instalar()
    print(f"Instalada en {DESTINO}" if codigo == 0 else "La instalación tiene plantillas inválidas")
    sys.exit(codigo)
