#!/usr/bin/env python3
import os
import io
import zipfile
import html
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

# XML escaping & DOCX generator
def escape_xml(text: str) -> str:
    if not text:
        return ""
    clean = "".join(ch for ch in text if ch in "\t\n\r" or ord(ch) >= 32)
    return html.escape(clean, quote=True)

def create_docx_bytes(title: str, markdown_body: str) -> bytes:
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>"""

    paragraphs_xml = []
    safe_title = escape_xml(title)
    paragraphs_xml.append(
        f'<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>'
        f'<w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t xml:space="preserve">{safe_title}</w:t></w:r></w:p>'
    )
    
    for line in markdown_body.splitlines():
        st = line.strip()
        if not st:
            paragraphs_xml.append('<w:p/>')
        elif st.startswith('# '):
            paragraphs_xml.append(f'<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>{escape_xml(st[2:])}</w:t></w:r></w:p>')
        elif st.startswith('## '):
            paragraphs_xml.append(f'<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>{escape_xml(st[3:])}</w:t></w:r></w:p>')
        elif st.startswith('- ') or st.startswith('* '):
            paragraphs_xml.append(f'<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>• {escape_xml(st[2:])}</w:t></w:r></w:p>')
        else:
            paragraphs_xml.append(f'<w:p><w:r><w:t xml:space="preserve">{escape_xml(line)}</w:t></w:r></w:p>')

    body_content = "".join(paragraphs_xml)
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body_content}
    <w:sectPr/>
  </w:body>
</w:document>"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as docx_zip:
        docx_zip.writestr("[Content_Types].xml", content_types)
        docx_zip.writestr("_rels/.rels", rels)
        docx_zip.writestr("word/_rels/document.xml.rels", doc_rels)
        docx_zip.writestr("word/document.xml", document_xml)
    return buf.getvalue()

def build_excel_workbook(modules, lessons, skills_catalog) -> bytes:
    wb = openpyxl.Workbook()
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="C2410C", end_color="C2410C", fill_type="solid")
    normal_font = Font(name="Arial", size=11)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # 1. Modules Sheet
    ws_mod = wb.active
    ws_mod.title = "Modules"
    ws_mod.views.sheetView[0].showGridLines = True
    ws_mod.freeze_panes = "A2"
    mod_headers = ["Module Reference", "Module Title", "Skill Code or Name", "Knowledge Level", "Module Type", "Duration (minutes)"]
    ws_mod.row_dimensions[1].height = 36
    for col_idx, h in enumerate(mod_headers, start=1):
        cell = ws_mod.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for row_idx, mod in enumerate(modules, start=2):
        ws_mod.row_dimensions[row_idx].height = 24
        ws_mod.cell(row=row_idx, column=1, value=mod["ref"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=2, value=mod["title"]).alignment = left_align
        ws_mod.cell(row=row_idx, column=3, value=mod["skill"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=4, value=mod["level"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=5, value=mod["type"]).alignment = center_align
        ws_mod.cell(row=row_idx, column=6, value=mod["duration"]).alignment = center_align
        for col_idx in range(1, 7):
            ws_mod.cell(row=row_idx, column=col_idx).font = normal_font

    ws_mod.column_dimensions["A"].width = 24
    ws_mod.column_dimensions["B"].width = 54
    ws_mod.column_dimensions["C"].width = 24
    ws_mod.column_dimensions["D"].width = 20
    ws_mod.column_dimensions["E"].width = 30
    ws_mod.column_dimensions["F"].width = 20

    # 2. Lessons Sheet
    ws_les = wb.create_sheet("Lessons")
    ws_les.views.sheetView[0].showGridLines = True
    ws_les.freeze_panes = "A2"
    les_headers = ["Module Reference", "Order", "Lesson Title", "Lesson Type", "Content File"]
    ws_les.row_dimensions[1].height = 36
    for col_idx, h in enumerate(les_headers, start=1):
        cell = ws_les.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for row_idx, les in enumerate(lessons, start=2):
        ws_les.row_dimensions[row_idx].height = 24
        ws_les.cell(row=row_idx, column=1, value=les["moduleRef"]).alignment = center_align
        ws_les.cell(row=row_idx, column=2, value=les["order"]).alignment = center_align
        ws_les.cell(row=row_idx, column=3, value=les["title"]).alignment = left_align
        ws_les.cell(row=row_idx, column=4, value=les["type"]).alignment = center_align
        ws_les.cell(row=row_idx, column=5, value=les["file"]).alignment = left_align
        for col_idx in range(1, 6):
            ws_les.cell(row=row_idx, column=col_idx).font = normal_font

    ws_les.column_dimensions["A"].width = 24
    ws_les.column_dimensions["B"].width = 12
    ws_les.column_dimensions["C"].width = 56
    ws_les.column_dimensions["D"].width = 20
    ws_les.column_dimensions["E"].width = 40

    # 3. Skills Sheet
    ws_cat = wb.create_sheet("Skills")
    ws_cat.views.sheetView[0].showGridLines = True
    ws_cat.freeze_panes = "A2"
    cat_headers = ["Skill Code", "Skill Name"]
    ws_cat.row_dimensions[1].height = 36
    for col_idx, h in enumerate(cat_headers, start=1):
        cell = ws_cat.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align

    for row_idx, (code, name) in enumerate(skills_catalog.items(), start=2):
        ws_cat.row_dimensions[row_idx].height = 24
        ws_cat.cell(row=row_idx, column=1, value=code).alignment = center_align
        ws_cat.cell(row=row_idx, column=2, value=name).alignment = left_align
        ws_cat.cell(row=row_idx, column=1).font = normal_font
        ws_cat.cell(row=row_idx, column=2).font = normal_font

    ws_cat.column_dimensions["A"].width = 24
    ws_cat.column_dimensions["B"].width = 54

    # 4. Instructions
    ws_ins = wb.create_sheet("Instructions")
    ws_ins.views.sheetView[0].showGridLines = False
    instructions = [
        "BRIGHTPATH LEARNING MODULE PACKAGE",
        "Upload the complete ZIP with module.xlsx at root and reading files under lesson/.",
        "Module Reference binds modules with their corresponding lessons.",
        "Each confirmed import creates new Drafts ready for expert submission and manager review."
    ]
    for row_idx, text in enumerate(instructions, start=1):
        c = ws_ins.cell(row=row_idx, column=1, value=text)
        c.font = normal_font

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def create_package_zip(output_path, modules, lessons, skills_catalog, lesson_docx_map):
    print(f"Creating package: {output_path} with {len(modules)} modules and {len(lessons)} lessons...")
    wb_bytes = build_excel_workbook(modules, lessons, skills_catalog)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("module.xlsx", wb_bytes)
        for filepath, docx_bytes in lesson_docx_map.items():
            z.writestr(filepath, docx_bytes)
    print(f"Successfully generated {output_path} ({os.path.getsize(output_path)} bytes).")

print("Script template ready.")

def main():
    os.makedirs("outputs", exist_ok=True)
    
    # 1. Load Skills Catalog from 04_MicroSkills_JavaBackend.xlsx
    wb_skills = openpyxl.load_workbook("Demo/04_MicroSkills_JavaBackend.xlsx", data_only=True)
    skills_sheet = wb_skills["Micro_Skills"]
    skills_catalog = {}
    skills_provision = {}
    
    for row in skills_sheet.iter_rows(min_row=2, values_only=True):
        if not row[0]: continue
        code = str(row[0]).strip()
        name = str(row[1]).strip()
        skills_catalog[code] = name
        skills_provision[code] = {
            "Foundation": str(row[3]).strip().lower() if len(row) > 3 and row[3] else "",
            "Intermediate": str(row[4]).strip().lower() if len(row) > 4 and row[4] else "",
            "Advanced": str(row[5]).strip().lower() if len(row) > 5 and row[5] else ""
        }

    # 2. Existing modules from current 06
    existing_modules = []
    existing_lessons = []
    existing_docx = {}
    with zipfile.ZipFile("Demo/06_Learning_Modules_Java_Backend_Demo.zip") as z:
        with z.open("module.xlsx") as mf:
            wb_curr = openpyxl.load_workbook(io.BytesIO(mf.read()), data_only=True)
            for r in wb_curr["Modules"].iter_rows(min_row=2, values_only=True):
                if r[0]:
                    existing_modules.append({
                        "ref": r[0], "title": r[1], "skill": r[2], "level": r[3], "type": r[4], "duration": r[5] or 5
                    })
            for r in wb_curr["Lessons"].iter_rows(min_row=2, values_only=True):
                if r[0]:
                    existing_lessons.append({
                        "moduleRef": r[0], "order": r[1], "title": r[2], "type": r[3], "file": r[4]
                    })
        for name in z.namelist():
            if name.startswith("lesson/") and name.endswith(".docx"):
                existing_docx[name] = z.read(name)

    # 3. Dedicated Demo Modules definitions (Plan B)
    demo_specific_modules = [
        {
            "ref": "DEMO-COLL-I-A",
            "title": "Java Collections Intermediate Guided Practice",
            "skill": "MS-JAVA-COLL",
            "level": "Intermediate",
            "type": "Lesson and practice",
            "duration": 5,
            "lessons": [
                ("Java Collections Performance & Map Internals", "Detailed walkthrough of HashMap buckets, tree bins, resize thresholds, and concurrent collection choices."),
                ("Hands-on Collection Benchmarking & Safe Iteration", "Step-by-step guided activity refactoring collection iteration, key immutability, and defensive copying.")
            ]
        },
        {
            "ref": "DEMO-COLL-I-B",
            "title": "Java Collections Intermediate Scenario Workshop",
            "skill": "MS-JAVA-COLL",
            "level": "Intermediate",
            "type": "Resource-guided practice",
            "duration": 5,
            "lessons": [
                ("Scenario: High-Throughput In-Memory Caching", "Deep dive into thread-safe collection structures, eviction policies, and memory footprint tradeoffs."),
                ("Scenario Refactoring & Invariant Validation", "Troubleshoot race conditions in non-thread-safe collection wrappers under simulated load.")
            ]
        },
        {
            "ref": "DEMO-INDEX-I",
            "title": "SQL Indexing Intermediate Guided Practice",
            "skill": "MS-SQL-INDEX",
            "level": "Intermediate",
            "type": "Lesson and practice",
            "duration": 5,
            "lessons": [
                ("Composite Index Design & B-Tree Mechanics", "Understanding left-prefix matching, covering indexes, and index selectivity on high-volume tables."),
                ("Index Tuning with EXPLAIN ANALYZE", "Identify seq-scans, index-scans vs bitmap scans and rewrite query predicates to leverage composite indexes.")
            ]
        },
        {
            "ref": "DEMO-INDEX-F",
            "title": "SQL Indexing Foundation Guided Practice",
            "skill": "MS-SQL-INDEX",
            "level": "Foundation",
            "type": "Lesson and practice",
            "duration": 5,
            "lessons": [
                ("Relational Database Index Fundamentals", "Introduction to primary keys, unique constraints, and single-column B-tree index structures."),
                ("Creating and Verifying Indexes", "Hands-on guided practice creating indexes and observing scan type differences in execution plans.")
            ]
        },
        {
            "ref": "DEMO-SQL-I",
            "title": "SQL Querying Intermediate Guided Practice",
            "skill": "MS-SQL-QUERY",
            "level": "Intermediate",
            "type": "Lesson and practice",
            "duration": 5,
            "lessons": [
                ("Advanced Joins, Grouping & Window Functions", "Techniques for inner/outer joins, aggregation filters, row_number(), and running totals."),
                ("Writing Performant Query Pipelines", "Refactor subqueries into common table expressions (CTEs) and eliminate redundant table scans.")
            ]
        },
        {
            "ref": "DEMO-DOCKER-F",
            "title": "Docker Foundation Guided Practice",
            "skill": "MS-DOCKER",
            "level": "Foundation",
            "type": "Lesson and practice",
            "duration": 5,
            "lessons": [
                ("Containerization Basics & Dockerfile Architecture", "Understanding images, layers, runtime containers, and port mapping fundamentals."),
                ("Building and Running Your First Service Container", "Write a clean multi-stage Dockerfile for a Java application and inspect container health.")
            ]
        }
    ]

    # Generate Plan B Package
    plan_b_modules = list(existing_modules)
    plan_b_lessons = list(existing_lessons)
    plan_b_docx = dict(existing_docx)

    for m in demo_specific_modules:
        plan_b_modules.append({
            "ref": m["ref"], "title": m["title"], "skill": m["skill"],
            "level": m["level"], "type": m["type"], "duration": m["duration"]
        })
        for idx, (ltitle, ldesc) in enumerate(m["lessons"], start=1):
            file_path = f"lesson/{m['ref'].lower()}-{idx}.docx"
            plan_b_lessons.append({
                "moduleRef": m["ref"],
                "order": idx,
                "title": f"{m['title']} - {ltitle}",
                "type": "Reading",
                "file": file_path
            })
            plan_b_docx[file_path] = create_docx_bytes(
                f"{m['title']} - {ltitle}",
                f"# {m['title']}\n\n## {ltitle}\n\n{ldesc}\n\n### Learning Objectives\n- Understand core concepts and trade-offs.\n- Apply verified patterns in real-world scenarios.\n- Validate system behavior through automated tests.\n"
            )

    create_package_zip("outputs/06_Learning_Modules_Plan_B_Demo_Focused.zip", plan_b_modules, plan_b_lessons, skills_catalog, plan_b_docx)

    # 4. Generate Plan A Package (Full 39 Slots)
    plan_a_modules = list(plan_b_modules)
    plan_a_lessons = list(plan_b_lessons)
    plan_a_docx = dict(plan_b_docx)

    # Check which skill-level slots are covered in plan_a
    covered_slots = {(m["skill"], m["level"].lower()) for m in plan_a_modules}

    # Helper for generating missing slots
    short_prefixes = {
        "MS-JAVA-OOP": "OOP",
        "MS-JAVA-COLL": "COLL",
        "MS-JAVA-STREAM": "STREAM",
        "MS-JAVA-CONC": "CONC",
        "MS-SPRING-DI": "DI",
        "MS-SPRING-WEB": "WEB",
        "MS-SPRING-DATA": "DATA",
        "MS-SPRING-TX": "TX",
        "MS-SQL-QUERY": "SQL",
        "MS-SQL-INDEX": "INDEX",
        "MS-DB-MIGRATE": "MIGRATE",
        "MS-REST-DESIGN": "REST",
        "MS-API-SEC": "SEC",
        "MS-JUNIT": "JUNIT",
        "MS-DOCKER": "DOCKER",
        "MS-OBSERV": "OBSERV"
    }

    level_abbr = {"Foundation": "F", "Intermediate": "I", "Advanced": "A"}

    for code, sname in skills_catalog.items():
        prov = skills_provision.get(code, {})
        for lvl_name in ["Foundation", "Intermediate", "Advanced"]:
            if prov.get(lvl_name) == "module":
                if (code, lvl_name.lower()) not in covered_slots:
                    prefix = short_prefixes.get(code, "SKILL")
                    abbr = level_abbr[lvl_name]
                    mod_ref = f"DEMO-{prefix}-{abbr}"
                    mod_title = f"{sname} {lvl_name} Guided Practice"
                    
                    plan_a_modules.append({
                        "ref": mod_ref,
                        "title": mod_title,
                        "skill": code,
                        "level": lvl_name,
                        "type": "Lesson and practice",
                        "duration": 5
                    })
                    
                    l1_title = f"{mod_title} Core Concepts"
                    l1_file = f"lesson/{mod_ref.lower()}-1.docx"
                    l2_title = f"{mod_title} Guided Hands-on Lab"
                    l2_file = f"lesson/{mod_ref.lower()}-2.docx"

                    plan_a_lessons.append({
                        "moduleRef": mod_ref, "order": 1, "title": l1_title, "type": "Reading", "file": l1_file
                    })
                    plan_a_docx[l1_file] = create_docx_bytes(
                        l1_title,
                        f"# {mod_title}\n\n## Core Concepts and Principles\n\nComprehensive exploration of {sname} at {lvl_name} level.\n\n### Key Competency Areas\n- Architectural design & idioms\n- Edge-case handling & failure modes\n- Performance considerations\n"
                    )

                    plan_a_lessons.append({
                        "moduleRef": mod_ref, "order": 2, "title": l2_title, "type": "Reading", "file": l2_file
                    })
                    plan_a_docx[l2_file] = create_docx_bytes(
                        l2_title,
                        f"# {mod_title}\n\n## Guided Hands-on Lab\n\nStep-by-step practical implementation and validation for {sname}.\n\n### Instructions\n- Write unit tests validating domain rules.\n- Implement minimal idiomatic solution.\n- Inspect execution logs and metrics.\n"
                    )
                    covered_slots.add((code, lvl_name.lower()))

    create_package_zip("outputs/06_Learning_Modules_Plan_A_Full_39.zip", plan_a_modules, plan_a_lessons, skills_catalog, plan_a_docx)
    print("Done generating Plan A and Plan B.")

if __name__ == "__main__":
    main()
