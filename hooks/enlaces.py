"""Resuelve enlaces escritos dentro de bloques HTML (MkDocs no los toca).

- href="algo.md"  -> URL real de esa página (sirve con y sin use_directory_urls)
- href="@/ruta"   -> ruta relativa desde la página actual a la raíz del sitio
"""
import posixpath
import re

HREF = re.compile(r'href="(@/[^"]*|[^":#]+\.md(?:#[^"]*)?)"')


def _relativa(destino: str, page) -> str:
    base = posixpath.dirname(page.url) if not page.url.endswith("/") else page.url.rstrip("/")
    rel = posixpath.relpath(destino or ".", base or ".")
    return rel + ("/" if destino.endswith("/") and not rel.endswith("/") else "")


def on_page_content(html, page, config, files, **kwargs):
    def cambiar(m):
        valor = m.group(1)
        if valor.startswith("@/"):
            return f'href="{_relativa(valor[2:], page)}"'
        ruta, _, ancla = valor.partition("#")
        origen = posixpath.normpath(posixpath.join(posixpath.dirname(page.file.src_uri), ruta))
        f = files.get_file_from_path(origen)
        if f is None:
            return m.group(0)
        url = _relativa(f.url, page)
        return f'href="{url}{"#" + ancla if ancla else ""}"'

    return HREF.sub(cambiar, html)
