import unittest
from pathlib import Path

SKILL = (Path(__file__).resolve().parent.parent / "SKILL.md").read_text(encoding="utf-8")


class TestSkillMd(unittest.TestCase):
    def test_ofrece_lineamientos_si_solo_hay_claude_md(self):
        self.assertIn("ofrécele una vez crear `LINEAMIENTOS.md`", SKILL)

    def test_regenera_primera_tanda_al_definir_comandos(self):
        self.assertIn("incluidos los de la primera tanda", SKILL)
