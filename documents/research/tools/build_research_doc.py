"""Build the English framework only; does not run research experiments."""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
doc = Document()
s = doc.sections[0]
s.page_width, s.page_height = Inches(8.27), Inches(11.69)
s.top_margin = s.bottom_margin = Inches(.75)
s.left_margin = s.right_margin = Inches(.8)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(8)
normal.paragraph_format.line_spacing = 1.08
for name, size in [('Title',22),('Heading 1',15),('Heading 2',12)]:
    st = doc.styles[name]
    st.font.name = 'Calibri'
    st.font.size = Pt(size)
    st.font.color.rgb = RGBColor(0,0,0)
    st.font.bold = True
    st.paragraph_format.space_before = Pt(10)
    st.paragraph_format.space_after = Pt(8)
for line in (ROOT/'RESEARCH_FRAMEWORK.md').read_text().splitlines():
    if not line.strip(): continue
    if line == '<!-- pagebreak -->': doc.add_page_break()
    elif line.startswith('# '): doc.add_paragraph(line[2:], 'Title')
    elif line.startswith('## '): doc.add_paragraph(line[3:], 'Heading 1')
    else: doc.add_paragraph(line)
p = s.footer.paragraphs[0]
p.alignment = 2
r=p.add_run(); r.font.size=Pt(9)
f=OxmlElement('w:fldSimple'); f.set(qn('w:instr'),'PAGE'); r._r.addnext(f)
for border in list(doc.styles.element.iter(qn('w:pBdr'))):
    border.getparent().remove(border)
for border in list(doc.element.iter(qn('w:pBdr'))):
    border.getparent().remove(border)
doc.core_properties.title = 'Knowledge Graph Based Adaptive Learning Pathways for Workforce Competency Development'
doc.core_properties.subject = 'Research framework and evaluation plan'
doc.core_properties.author = ''
doc.core_properties.keywords = 'research framework, recommendation, graph latency, adaptive pathways'
out = ROOT/'Knowledge_Graph-Based_Adaptive_Learning_Pathways_for_Workforce_Competency_Development.docx'
doc.save(out)
print(out)
