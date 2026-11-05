"""Genera los PDF de la web a partir del sitio ya construido por MkDocs.

Uso:  mkdocs build && python scripts/generar_pdfs.py [carpeta_del_sitio]

- Un PDF por página en  <sitio>/pdf/<ruta-con-guiones>.pdf
  (fase-2/README.md -> fase-2-resumen.pdf). Coincide con el botón
  "Descargar PDF" de overrides/main.html.
- PDF combinados por parte del programa y uno con todo, con marcadores.

Usa Chromium a través de Playwright con los estilos de impresión de la web
(docs/assets/estilos.css), así que el PDF es igual que imprimir desde el navegador.
"""
from __future__ import annotations

import functools
import http.server
import os
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "docs"
SITIO = Path(sys.argv[1] if len(sys.argv) > 1 else RAIZ / "site").resolve()
SALIDA = SITIO / "pdf"

EXCLUIR = {"index.md", "descargas.md"}

# Orden de lectura (igual que el menú de mkdocs.yml)
PARTES: dict[str, tuple[str, list[str]]] = {
    "primer-mes-completo": ("Primer mes", [
        "fase-2/README.md", "fase-2/semana-1.md", "fase-2/semana-2.md",
        "fase-2/semana-3.md", "fase-2/semana-4.md", "fase-2/anexos.md"]),
    "mes-2-coco": ("Mes 2 · Coco", [
        "mes-2/README.md", "mes-2/semana-5.md", "mes-2/semana-6.md",
        "mes-2/semana-7.md", "mes-2/semana-8.md", "mes-2/anexos.md"]),
    "mes-3-ratatouille": ("Mes 3 · Ratatouille", [
        "mes-3/README.md", "mes-3/semana-9.md", "mes-3/semana-10.md",
        "mes-3/semana-11.md", "mes-3/semana-12.md", "mes-3/anexos.md"]),
    "mes-4-frozen": ("Mes 4 · Frozen", [
        "mes-4/README.md", "mes-4/semana-13.md", "mes-4/semana-14.md",
        "mes-4/semana-15.md", "mes-4/semana-16.md", "mes-4/anexos.md"]),
    "mes-5-rey-leon": ("Mes 5 · El Rey León", [
        "mes-5/README.md", "mes-5/semana-17.md", "mes-5/semana-18.md",
        "mes-5/semana-19.md", "mes-5/semana-20.md", "mes-5/anexos.md"]),
    "mes-6-encanto": ("Mes 6 · Encanto", [
        "mes-6/README.md", "mes-6/semana-21.md", "mes-6/semana-22.md",
        "mes-6/semana-23.md", "mes-6/semana-24.md", "mes-6/anexos.md"]),
    "mes-7-aladdin": ("Mes 7 · Aladdín", [
        "mes-7/README.md", "mes-7/semana-25.md", "mes-7/semana-26.md",
        "mes-7/semana-27.md", "mes-7/semana-28.md", "mes-7/anexos.md"]),
    "banco-de-recursos": ("Banco de recursos", [
        "fase-3/README.md", "fase-3/juegos.md", "fase-3/canciones.md",
        "fase-3/storytime.md", "fase-3/peppa.md", "fase-3/cultura.md",
        "fase-3/ideas.md"]),
    "materiales-y-evaluacion": ("Materiales y evaluación", [
        "fase-4/README.md", "fase-4/evaluacion.md", "fase-4/familias.md",
        "fase-4/plantillas.md"]),
    "guia-del-aula": ("Guía del aula", [
        "fase-5/README.md", "fase-5/aula.md", "fase-5/edades-mixtas.md",
        "fase-5/preparacion.md", "fase-5/plan-b.md", "fase-5/protocolos.md",
        "fase-5/problemas-frecuentes.md"]),
}
DISENO = "fase-1-diseno-maestro.md"


def slug(src: str) -> str:
    return src[:-3].replace("/README", "/resumen").replace("/", "-")


def url(src: str) -> str:
    """Ruta en el sitio con use_directory_urls (por defecto en MkDocs)."""
    sin_ext = src[:-3]
    if sin_ext.endswith("README") or sin_ext.endswith("index"):
        return sin_ext.rsplit("/", 1)[0] + "/" if "/" in sin_ext else ""
    return sin_ext + "/"


PIE = """
<div style="width:100%;font-size:8px;color:#666;padding:0 14mm;
            font-family:Arial,sans-serif;display:flex;justify-content:space-between">
  <span class="title"></span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>"""


def servidor(carpeta: Path) -> tuple[http.server.ThreadingHTTPServer, int]:
    class Silencioso(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):  # sin registro de peticiones
            pass

    manejador = functools.partial(Silencioso, directory=str(carpeta))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manejador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def titulo(pdf: Path) -> str:
    meta = PdfReader(pdf).metadata
    return (meta.title if meta and meta.title else pdf.stem).split(" - ")[0]


def combinar(destino: Path, archivos: list[Path], titulo_doc: str) -> None:
    w = PdfWriter()
    for f in archivos:
        inicio = len(w.pages)
        w.append(str(f), import_outline=False)
        w.add_outline_item(titulo(f), inicio)
    w.add_metadata({"/Title": f"{titulo_doc} · Pasaporte al Español"})
    with destino.open("wb") as fh:
        w.write(fh)


def main() -> None:
    if not (SITIO / "index.html").exists():
        sys.exit(f"No encuentro el sitio en {SITIO}. Ejecuta antes: mkdocs build")
    SALIDA.mkdir(parents=True, exist_ok=True)

    paginas = sorted(
        p.relative_to(DOCS).as_posix() for p in DOCS.rglob("*.md")
        if p.relative_to(DOCS).as_posix() not in EXCLUIR
    )
    srv, puerto = servidor(SITIO)
    lanzar = {}
    if os.environ.get("CHROMIUM_PATH"):
        lanzar["executable_path"] = os.environ["CHROMIUM_PATH"]

    generados: dict[str, Path] = {}
    try:
        with sync_playwright() as pw:
            navegador = pw.chromium.launch(**lanzar)
            pagina = navegador.new_page()
            pagina.emulate_media(media="print", color_scheme="light")
            for src in paginas:
                pagina.goto(f"http://127.0.0.1:{puerto}/{url(src)}", wait_until="networkidle")
                destino = SALIDA / f"{slug(src)}.pdf"
                pagina.pdf(
                    path=str(destino),
                    prefer_css_page_size=True,
                    print_background=True,
                    display_header_footer=True,
                    header_template="<span></span>",
                    footer_template=PIE,
                )
                generados[src] = destino
                print(f"  ✓ {destino.name}")
            navegador.close()
    finally:
        srv.shutdown()

    for nombre, (tit, fuentes) in PARTES.items():
        combinar(SALIDA / f"{nombre}.pdf", [generados[s] for s in fuentes], tit)
        print(f"  ✓ {nombre}.pdf")

    todo = [generados[DISENO]] + [generados[s] for _, fs in PARTES.values() for s in fs]
    combinar(SALIDA / "programa-completo.pdf", todo, "Programa completo")
    print("  ✓ programa-completo.pdf")


if __name__ == "__main__":
    main()
