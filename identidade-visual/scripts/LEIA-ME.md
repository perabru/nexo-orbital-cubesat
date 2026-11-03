# Reproduzir o manual

Requisitos: Python 3, reportlab, PyMuPDF, Pillow e fontTools. Na raiz do repositório, execute:

```bash
python3 -m pip install reportlab PyMuPDF Pillow fonttools
python3 identidade-visual/scripts/gerar_guia.py
```

O gerador lê brand.json e as fontes/marcas locais. Recria PDF, manual HTML, PNGs, modelos e kit ZIP. Confira o resultado visual antes de publicar. Os arquivos temporários ficam em tmp/pdfs e a cópia do PDF em output/pdf.
