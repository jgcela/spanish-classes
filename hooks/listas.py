"""Hace que las listas se vean en la web igual que en GitHub.

El Markdown de GitHub acepta listas sin línea en blanco antes y sublistas con
2 o 3 espacios. El Markdown de MkDocs no: las convierte en texto corrido.
Este hook ajusta el texto solo al construir la web; los .md no se tocan.
"""
import re

ITEM = re.compile(r"^(?:[-*+]|\d+\.)\s")
SANGRIA = re.compile(r"^( {2,3})(?=\S)")


def on_page_markdown(markdown, **kwargs):
    salida = []
    en_codigo = False
    previa = ""
    for linea in markdown.split("\n"):
        if linea.lstrip().startswith("```"):
            en_codigo = not en_codigo
        if not en_codigo:
            # Sublistas y continuaciones con 2–3 espacios -> 4 espacios
            if previa.strip() and (ITEM.match(previa.lstrip()) or previa.startswith("    ")):
                linea = SANGRIA.sub("    ", linea)
            # Línea en blanco antes de una lista que sigue a un párrafo
            if (ITEM.match(linea) and previa.strip()
                    and not ITEM.match(previa.lstrip())
                    and not previa.startswith((" ", "\t", "|", "<"))):
                salida.append("")
        salida.append(linea)
        previa = linea
    return "\n".join(salida)
