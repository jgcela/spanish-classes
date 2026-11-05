# Pasaporte al Español

Programa extraescolar de español (5–14 años). Material de la profesora.

**Web:** https://jgcela.github.io/spanish-classes/ — con buscador, menú, modo móvil y PDF de cada página.

## Cómo está organizado

- `docs/` — el contenido, en Markdown (fases 1 a 5). Es lo único que hay que editar.
- `mkdocs.yml` — menú y aspecto de la web.
- `overrides/`, `docs/assets/` — botones de PDF/imprimir y estilos (también los de impresión).
- `hooks/listas.py` — ajusta las listas para que se vean igual que en GitHub.
- `scripts/generar_pdfs.py` — crea los PDF a partir de la web ya construida.
- `.github/workflows/web.yml` — en cada cambio en `main` construye la web, genera los PDF y publica en GitHub Pages.

## Paquete para subir a otra web

`OFFLINE=true mkdocs build -d paquete && python scripts/generar_pdfs.py paquete` crea una carpeta con páginas `.html`, rutas relativas y buscador que funciona sin servidor. El CI la deja como artefacto (*pasaporte-al-espanol-html*) y, si existen los secretos `FTP_SERVER`, `FTP_USERNAME` y `FTP_PASSWORD` (y opcionalmente `FTP_DIR`), la sube por FTP en cada cambio en `main`.

## Probarla en local

```bash
pip install -r requirements.txt
python -m playwright install chromium
mkdocs serve                      # web en http://127.0.0.1:8000
mkdocs build && python scripts/generar_pdfs.py   # web + PDF en site/
```
