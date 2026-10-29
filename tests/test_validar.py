import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "scripts"))

import validar  # noqa: E402

FIX = RAIZ / "tests" / "fixtures"


class TestPlantillas(unittest.TestCase):
    def test_plantilla_valida_pasa(self):
        self.assertEqual(validar.errores_plantilla(FIX / "plantilla_ok.md"), [])

    def test_reviewer_con_write_falla(self):
        errores = validar.errores_plantilla(FIX / "reviewer_con_write.md")
        self.assertTrue(any("tools" in e for e in errores), errores)

    def test_agent_prohibido(self):
        errores = validar.errores_plantilla(FIX / "con_agent.md")
        self.assertTrue(any("Agent" in e for e in errores), errores)

    def test_color_gris_falla(self):
        errores = validar.errores_plantilla(FIX / "color_gris.md")
        self.assertTrue(any("color" in e for e in errores), errores)


class TestPlantillasReales(unittest.TestCase):
    def test_plantillas_reales_validas(self):
        roles = [p for p in sorted((RAIZ / "plantillas").glob("*.md")) if p.name != "lineamientos.md"]
        self.assertEqual(len(roles), 9, [p.name for p in roles])
        for plantilla in roles:
            self.assertEqual(validar.errores_plantilla(plantilla), [], plantilla.name)


class TestAgentes(unittest.TestCase):
    def test_agente_con_marcador_falla(self):
        errores = validar.errores_agente(FIX / "malos" / "code-reviewer.md")
        self.assertTrue(any("{{STACK}}" in e for e in errores), errores)

    def test_agente_sin_marca_falla(self):
        errores = validar.errores_agente(FIX / "agente_sin_marca.md")
        self.assertTrue(any("marca" in e for e in errores), errores)

    def test_sellar_y_verificar(self):
        with tempfile.TemporaryDirectory() as tmp:
            copia = Path(tmp) / "code-reviewer.md"
            shutil.copy(FIX / "buenos" / "code-reviewer.md", copia)
            huella = validar.sellar(copia)
            self.assertRegex(huella, r"^[0-9a-f]{64}$")
            self.assertFalse(validar.editado(copia))
            with copia.open("a", encoding="utf-8") as f:
                f.write("Línea agregada a mano.\n")
            self.assertTrue(validar.editado(copia))

    def test_cli_codigo_salida(self):
        script = RAIZ / "scripts" / "validar.py"
        malos = subprocess.run([sys.executable, str(script), "agentes", str(FIX / "malos")],
                               capture_output=True, text=True, encoding="utf-8")
        buenos = subprocess.run([sys.executable, str(script), "agentes", str(FIX / "buenos")],
                                capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(malos.returncode, 1, malos.stdout + malos.stderr)
        self.assertEqual(buenos.returncode, 0, buenos.stdout + buenos.stderr)


if __name__ == "__main__":
    unittest.main()
