"""Datos para el planificador del curso (docs/planificador.md).

Recoge, de las páginas semana-N.md ya convertidas a HTML, el título de cada
semana y de cada sesión ("Sesión 21 · Lunes · ...") con su ancla, y los
inyecta como JSON en la página del planificador. Así el calendario siempre
coincide con el contenido publicado, sin listas copiadas a mano.
"""
import html as html_lib
import json
import posixpath
import re

SEMANA_SRC = re.compile(r"semana-(\d+)\.md$")
H1 = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S)
H2 = re.compile(r'<h2 id="([^"]+)">(.*?)</h2>', re.S)
SESION = re.compile(r"^Sesión (\d+) · (\w+)([^·]*?) · (.*)$")
MARCA = '<script type="application/json" id="sesiones-json">[]</script>'

_semanas: dict[int, dict] = {}
_sesiones: dict[int, dict] = {}


def _texto(fragmento: str) -> str:
    fragmento = re.sub(r'<a class="headerlink".*?</a>', "", fragmento, flags=re.S)
    return html_lib.unescape(re.sub(r"<[^>]+>", "", fragmento)).strip()


def _sin_comillas(t: str) -> str:
    t = t.strip()
    if len(t) > 1 and t[0] in '"“' and t[-1] in '"”' and t[1:-1].count('"') == 0:
        return t[1:-1]
    return t


def _relativa(destino: str, page) -> str:
    base = posixpath.dirname(page.url) if not page.url.endswith("/") else page.url.rstrip("/")
    rel = posixpath.relpath(destino or ".", base or ".")
    return rel + ("/" if destino.endswith("/") and not rel.endswith("/") else "")


def on_pre_build(config, **kwargs):
    _semanas.clear()
    _sesiones.clear()


def on_page_content(html, page, config, files, **kwargs):
    m = SEMANA_SRC.search(page.file.src_uri)
    if not m:
        return html
    semana = int(m.group(1))
    h1 = H1.search(html)
    titulo = _texto(h1.group(1)) if h1 else f"Semana {semana}"
    titulo = re.sub(r"^Semana \d+\s*·\s*", "", titulo)
    _semanas[semana] = {"n": semana, "titulo": titulo, "url": page.url}
    for ancla, contenido in H2.findall(html):
        s = SESION.match(_texto(contenido))
        if s:
            n = int(s.group(1))
            _sesiones[n] = {
                "n": n,
                "semana": semana,
                "dia": s.group(2),
                "titulo": (_sin_comillas(s.group(4)) + " " + s.group(3).strip()).strip(),
                "url": f"{page.url}#{ancla}",
            }
    return html


def on_post_page(output, page, config, **kwargs):
    if page.file.src_uri != "planificador.md" or MARCA not in output:
        return output

    def rel(url: str) -> str:
        ruta, _, ancla = url.partition("#")
        r = _relativa(ruta, page)
        return r + ("#" + ancla if ancla else "")

    datos = {
        "semanas": [dict(s, url=rel(s["url"])) for _, s in sorted(_semanas.items())],
        "sesiones": [dict(s, url=rel(s["url"])) for _, s in sorted(_sesiones.items())],
        "planB": rel(_buscar(config, "fase-5/plan-b.md")),
    }
    js = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
    return output.replace(MARCA, MARCA.replace("[]", js))


def _buscar(config, src):
    # La URL de una página según use_directory_urls
    if config.get("use_directory_urls", True):
        return src[:-3] + "/"
    return src[:-3] + ".html"
