import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

import instalar  # noqa: E402


class TestInstalar(unittest.TestCase):
    def test_instalar_en_carpeta_temporal(self):
        with tempfile.TemporaryDirectory() as tmp:
            destino = Path(tmp) / "equipo-tecnico"
            codigo = instalar.instalar(destino)
            self.assertEqual(codigo, 0)
            self.assertTrue((destino / "SKILL.md").is_file())
            self.assertTrue((destino / "metodo.md").is_file())
            self.assertTrue((destino / "scripts" / "validar.py").is_file())
            self.assertEqual(len(list((destino / "plantillas").glob("*.md"))), 10)
            self.assertFalse((destino / "tests").exists())

    def test_reinstalar_reemplaza(self):
        with tempfile.TemporaryDirectory() as tmp:
            destino = Path(tmp) / "equipo-tecnico"
            instalar.instalar(destino)
            (destino / "sobrante.md").write_text("viejo", encoding="utf-8")
            self.assertEqual(instalar.instalar(destino), 0)
            self.assertFalse((destino / "sobrante.md").exists())


if __name__ == "__main__":
    unittest.main()
