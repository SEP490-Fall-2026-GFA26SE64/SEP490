# REQ-017-F02: Explore Ontology Graph Playground System Test Evidence

## 1. Overview
- **Requirement ID**: `REQ-017-F02`
- **Feature**: Interactive Ontology Graph Playground
- **Actor**: Domain Expert / L&D Manager
- **Test Type**: Automated Playwright End-to-End User Flow Test
- **Spec File**: `frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts`

---

## 2. Interactive Playground Architecture

To solve the dense 556-node (474 competencies + 82 micro-skills, 1,891 edges) "hairball" problem and deliver an enterprise-grade experience (like Figma or Neo4j Bloom), the playground adheres to 6 core visualization principles:

### A. Blank Canvas by Default (Smart Initial Scope)
- Rather than dumping all 556 nodes at once, the canvas opens as a clean, blank workspace with an empty state prompt.
- Users can choose to:
  1. **Quick Sample (5 Competencies)**: Loads the top 5 most connected competencies and their member micro-skills (~25 nodes, cleanly spaced).
  2. **Load Full Catalog (556 Nodes)**: Available on-demand via the empty state prompt and the top action bar.
  3. **Drag & Drop / Click Palette**: Users search and place only the specific nodes they need.

### B. Double-Click to "Expand Neighbors"
- Double-clicking any competency node radially expands all member micro-skills that are not yet on the canvas.
- Double-clicking any micro-skill node radially expands its parent competencies and prerequisite skills.
- Direct relationship edges (`HAS_SKILL` and `HAS_SKILL_PREREQUISITE`) are automatically wired up.

### C. Neighbor Dimming on Selection / Focus
- Clicking any node isolates its local sub-graph:
  - All connected nodes and connecting edges remain vibrant in primary colors (`#EA580C` orange and `#16A34A` green, edge width 2.5).
  - All unrelated nodes and edges fade out to **15% opacity** (`#CBD5E1`), making complex graphs instantly legible.
- Clicking the canvas background clears dimming and restores full opacity.

### D. Level-of-Detail (LOD) & Semantic Zooming
- **Zoomed Out (`scale < 0.6x`)**: Node labels collapse into compact single-line code pills (e.g. `MS-CORE01`, `C-APP-J`) with font size 9, completely eliminating text overlap.
- **Zoomed In (`scale >= 0.6x`)**: Nodes expand to display their bold code, full title, and definition.

### E. Physics Stabilization & Freeze
- Barnes-Hut repulsive physics simulation runs for 120 iterations on layout.
- Upon stabilization (`network.on('stabilized')`), physics **automatically freezes** (`physics: { enabled: false }`).
- Nodes stay pinned where placed; dragging any node is silky smooth at 60 FPS without disturbing or jiggling the rest of the graph.
- A **Frozen / Dynamic** toggle in the top bar allows users to re-run or pause physics at will.

### F. High-Performance `vis-data` DataSets
- Node and edge states are managed through `DataSet<PlaygroundCustomNode>` and `DataSet<Edge>`, allowing direct, zero-lag updates without re-mounting or re-rendering React DOM trees.

---

## 3. Playwright Automated Test Results

```bash
cd frontend; npx playwright test system-tests/REQ-017-F02-ontology-explore-graph.spec.ts --config=playwright.system.config.ts
```

### Execution Log Output
```
Running 1 test using 1 worker

  ok 1 [system-chrome] › system-tests\REQ-017-F02-ontology-explore-graph.spec.ts:4:3 › REQ-017-F02 Explore Graph Playground Verification › explore graph initializes with clean empty canvas, supports on-demand loading, palette interaction, and clear (6.4s)

  1 passed (7.7s)
```

### Combined REQ-017 Suite Execution
```bash
cd frontend; npx playwright test system-tests/REQ-017-F01-ontology-and-roles-flow.spec.ts system-tests/REQ-017-F02-ontology-explore-graph.spec.ts --config=playwright.system.config.ts
```
```
Running 3 tests using 1 worker

  ok 1 [system-chrome] › system-tests\REQ-017-F01-ontology-and-roles-flow.spec.ts:4:3 › REQ-017-F01 & REQ-018-F01 Target Roles & Competency Ontology Verification › expert target roles catalog renders single-row filters without wrapping (2.3s)
  ok 2 [system-chrome] › system-tests\REQ-017-F01-ontology-and-roles-flow.spec.ts:43:3 › REQ-017-F01 & REQ-018-F01 Target Roles & Competency Ontology Verification › expert ontology catalog renders single-row filters and matching mastery outline pills (2.3s)
  ok 3 [system-chrome] › system-tests\REQ-017-F02-ontology-explore-graph.spec.ts:4:3 › REQ-017-F02 Explore Graph Playground Verification › explore graph initializes with clean empty canvas, supports on-demand loading, palette interaction, and clear (6.5s)

  3 passed (12.3s)
```

---

## 4. Manual Verification Checklist

| Scenario | Steps to Verify | Expected Result |
| :--- | :--- | :--- |
| **1. Empty Playground on Load** | 1. Navigate to `/expert/ontology`.<br>2. Click **Explore Graph** tab. | Graph initializes with 0 nodes on canvas and shows the clean "Playground Canvas is Ready" overlay with quick-start buttons. |
| **2. Quick Sample Loading** | Click **Quick Sample (5 Competencies)** on the empty overlay or top bar. | Loads the top 5 focal competencies and member micro-skills (~25 nodes) with clean spacing. Drag hint disappears. |
| **3. Expand Neighbors** | Double-click any node on the canvas (or click **Neighbors** in the inspector card). | Radial circle of connected micro-skills or competencies expands smoothly around the clicked node. |
| **4. Neighbor Dimming** | Click any node on the canvas. | Unrelated nodes and edges fade to 15% opacity. Connected neighbor paths highlight in vibrant orange/green. Clicking empty canvas resets. |
| **5. Semantic LOD Zooming** | Zoom out below 0.6x using mouse scroll or zoom buttons. | Node labels switch from full multi-line cards to compact short code badges (`MS-CORE01`, `C-APP-J`) to eliminate text overlap. |
| **6. Palette Placement** | 1. Search `MS-CORE01` in the palette.<br>2. Click the item card or drag it onto canvas. | Item is placed at the specified canvas coordinates with real-time relationship wiring. |
| **7. Clear Canvas** | Click the **Clear Canvas** button (trash icon). | Canvas resets to 0 nodes; empty state prompt reappears cleanly. |
| **8. Load Full Catalog** | Click **Load Full Catalog (556 Nodes)**. | Loads the entire ontology catalog with Barnes-Hut repulsion and auto-freezes once stabilized. |
