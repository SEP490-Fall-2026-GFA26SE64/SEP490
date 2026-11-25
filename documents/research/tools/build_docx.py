"""Build the research Word files from Markdown with pandoc (no python-docx needed).

Usage (repository root): python3 documents/research/tools/build_docx.py [source.md output.docx ...]
Without arguments it builds the manuscript and the framework. The reference document is generated from
pandoc's default and restyled: Times New Roman 12 pt, black headings, justified body text, booktabs-style
tables with 9 pt text and numbered captions from "Table:" lines. Output .docx files are git-ignored.
"""
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

RESEARCH = Path(__file__).resolve().parents[1]
FILTER = Path(__file__).resolve().parent / 'docx_filter.lua'
DEFAULT_TARGETS = [
    ('RESEARCH_MANUSCRIPT.md', 'RESEARCH_MANUSCRIPT.docx'),
    ('RESEARCH_FRAMEWORK.md', 'Knowledge_Graph-Based_Adaptive_Learning_Pathways_for_Workforce_Competency_Development.docx'),
]
FONT = '<w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" />'


def restyle(styles: str) -> str:
    styles = re.sub(r'<w:rFonts\b[^>]*/>', FONT, styles, flags=re.S)
    styles = re.sub(r'<w:color\b[^>]*/>', '', styles, flags=re.S)

    def patch(style_id, fn):
        nonlocal styles
        pattern = re.compile(r'(<w:style [^>]*w:styleId="%s".*?</w:style>)' % style_id, re.S)
        match = pattern.search(styles)
        if match:
            styles = styles[:match.start()] + fn(match.group(1)) + styles[match.end():]

    def add_ppr(xml):
        return lambda s: s.replace('</w:pPr>', xml + '</w:pPr>', 1) if '<w:pPr>' in s else s.replace('</w:style>', '<w:pPr>' + xml + '</w:pPr></w:style>', 1)

    def add_rpr(xml):
        return lambda s: s.replace('</w:rPr>', xml + '</w:rPr>', 1) if '<w:rPr>' in s else s.replace('</w:style>', '<w:rPr>' + xml + '</w:rPr></w:style>', 1)

    patch('BodyText', add_ppr('<w:jc w:val="both" /><w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto" />'))
    for heading in ('Heading1', 'Heading2', 'Heading3'):
        patch(heading, add_rpr('<w:b /><w:color w:val="000000" />'))
    patch('Title', add_rpr('<w:b /><w:sz w:val="36" /><w:szCs w:val="36" />'))
    patch('Subtitle', add_rpr('<w:i /><w:sz w:val="24" /><w:szCs w:val="24" />'))
    patch('TableCaption', add_rpr('<w:b /><w:i w:val="0" /><w:sz w:val="20" />'))
    patch('Hyperlink', add_rpr('<w:color w:val="1F4E79" />'))
    patch('Table', lambda s: s.replace(
        '<w:tblInd w:w="0" w:type="dxa" />',
        '<w:tblInd w:w="0" w:type="dxa" /><w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000" />'
        '<w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000" /></w:tblBorders>', 1
    ).replace('</w:tblPr>', '</w:tblPr><w:rPr><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr>', 1))
    return styles


def reference_docx(workdir: Path) -> Path:
    raw = workdir / 'pandoc-default.docx'
    with open(raw, 'wb') as out:
        subprocess.run(['pandoc', '--print-default-data-file', 'reference.docx'], check=True, stdout=out)
    ref = workdir / 'reference.docx'
    with zipfile.ZipFile(raw) as src, zipfile.ZipFile(ref, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            data = src.read(item.filename)
            if item.filename == 'word/styles.xml':
                data = restyle(data.decode('utf-8')).encode('utf-8')
            dst.writestr(item, data)
    return ref


def main() -> None:
    args = sys.argv[1:]
    targets = list(zip(args[0::2], args[1::2])) if args else DEFAULT_TARGETS
    if shutil.which('pandoc') is None:
        raise SystemExit('pandoc is required')
    with tempfile.TemporaryDirectory() as tmp:
        ref = reference_docx(Path(tmp))
        for source, output in targets:
            src = Path(source) if Path(source).is_absolute() else RESEARCH / source
            dst = Path(output) if Path(output).is_absolute() else RESEARCH / output
            subprocess.run([
                'pandoc', str(src), '-f', 'markdown+pipe_tables+tex_math_dollars', '-t', 'docx',
                '--reference-doc', str(ref), '--lua-filter', str(FILTER), '-o', str(dst),
            ], check=True, cwd=src.parent)
            print(f'built {dst}')


if __name__ == '__main__':
    main()
