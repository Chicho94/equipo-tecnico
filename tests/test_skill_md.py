import unittest
from pathlib import Path

SKILL = (Path(__file__).resolve().parent.parent / "SKILL.md").read_text(encoding="utf-8")


class TestSkillMd(unittest.TestCase):
    def test_ofrece_lineamientos_si_solo_hay_claude_md(self):
        self.assertIn("ofrécele una vez crear `LINEAMIENTOS.md`", SKILL)

    def test_proyecto_en_curso_lee_documentacion(self):
        self.assertIn("lee toda su documentación", SKILL)

    def test_sin_documentacion_lee_el_proyecto(self):
        self.assertIn("Si no hay documentación", SKILL)

    def test_presenta_lo_que_entendio_antes_del_equipo(self):
        self.assertIn("Lo que entendí del proyecto", SKILL)

    def test_equipo_va_en_el_mismo_mensaje_que_lo_entendido(self):
        self.assertIn("en el mismo mensaje", SKILL)

    def test_regenera_primera_tanda_al_definir_comandos(self):
        self.assertIn("incluidos los de la primera tanda", SKILL)
