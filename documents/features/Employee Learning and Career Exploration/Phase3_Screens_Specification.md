# Phase 3 Screens Specification: Employee Learning & Career Exploration

## 1. Overview & Architectural Scope Alignment

Phase 3 introduces the core learner experiences specified in the Capstone proposal, enabling employees to discover career interests, consume structured multi-modal module lessons, and explore elective technical skills independently of their primary target-role pathway.

All screens strictly adhere to the **UI-UX Pro Max** standard:
- CSS variables from `tokens.css` (zero hardcoded hex colors)
- Surface elevation with card surfaces over clean canvas
- Standard typography hierarchy (`--text-page`, `--text-section`, `--text-card`, `--text-body`, `--text-caption`)
- Snug modern density with anchored action bars and responsive card grids
- Shared reusable components (`<PageHeader>`, `<StatCard>`, `<Card>`, `<Button>`, `<Badge>`, `<Input>`, `<Progress>`, `<Dialog>`)
- No breadcrumbs on feature pages

---

## 2. Implemented Screens & Feature Breakdown

### Screen 1: RIASEC Career Interest Profiler (`/employee/riasec`)
- **Actor:** Employee / Learner
- **Path:** [frontend/src/features/employee/riasec/RiasecAssessmentPage.tsx](file:///d:/Code/Capstone/SEP490/frontend/src/features/employee/riasec/RiasecAssessmentPage.tsx)
- **Key Capabilities:**
  - **18-Item Standard Holland Profiler:** 3 statements for each of the 6 dimensions:
    - **R (Realistic):** Linux server administration, CI/CD hardware pipelines, resource debugging.
    - **I (Investigative):** Graph traversal algorithms, Bayesian mastery models, time-complexity benchmarks.
    - **A (Artistic):** UI/UX micro-interactions, intuitive domain models, graph visualizations.
    - **S (Social):** Developer mentoring, cross-functional workshops, empathetic technical communication.
    - **E (Enterprising):** Technical roadmap pitches, debt vs delivery trade-offs, milestone leadership.
    - **C (Conventional):** Relational schema constraints, ACID migrations, regression testing.
  - **Interactive 5-Point Likert Scale:** Responsive rating buttons from "Strongly Dislike" (1) to "Strongly Enjoy" (5) with real-time percentage progress.
  - **Holland Code Derivation:** Computes score percentages per dimension and extracts the top 3-letter Holland Code (e.g., `IRC`, `RCI`, `IAS`).
  - **Target Role Compatibility Matching:** Recommends relevant engineering target roles mapped to cognitive interest profiles.
  - **Profile Persistence:** Stores results in `localStorage` with retake capabilities and direct links to AI Role Guidance (`/employee/guidance`).

### Screen 2: Interactive Learning Module Content Reader (`/employee/modules/:moduleId`)
- **Actor:** Employee / Learner (in alignment with REQ-054: Learning Content Delivery)
- **Path:** [frontend/src/features/employee/modules/LearningModuleReaderPage.tsx](file:///d:/Code/Capstone/SEP490/frontend/src/features/employee/modules/LearningModuleReaderPage.tsx)
- **Key Capabilities:**
  - **Curriculum Syllabus Drawer:** Left drawer showing all lessons in the module with completion checkmarks, lesson duration, and lesson type badges (`video`, `reading`, `practice`).
  - **Simulated Video Lecture Player:** 1080p responsive media player with play/pause, scrub bar, playback speed controller, and timestamp counter.
  - **Rich Reading Content:** Clean markdown typography formatting Cypher queries, architectural rules, and graph patterns.
  - **Embedded Formative Knowledge Check:** In-lesson multiple-choice practice question with immediate explanation rationale and mastery credit upon correct submission.
  - **Lesson Progress Flow:** Previous/Next lesson navigation, lesson completion toggle, overall module progress bar, and direct gateway to module quiz assessment (`/employee/assessment`).
  - **Pathway Timeline Integration:** Enhanced [`AdaptivePathwayTimeline.tsx`](file:///d:/Code/Capstone/SEP490/frontend/src/features/employee/components/AdaptivePathwayTimeline.tsx) with an "Open Module Lessons" button on all unlocked steps.

### Screen 3: Independent Micro-Skill Catalog (`/employee/skills-catalog`)
- **Actor:** Employee / Learner (in alignment with REQ-055: Individual Skill Learning)
- **Path:** [frontend/src/features/employee/skills-catalog/IndividualSkillCatalogPage.tsx](file:///d:/Code/Capstone/SEP490/frontend/src/features/employee/skills-catalog/IndividualSkillCatalogPage.tsx)
- **Key Capabilities:**
  - **REQ-055-F01 Browse Available Micro-Skills:** Filter by domain (Software Engineering, Data & AI, Cloud & Infrastructure), status (Enrolled, Mastered, Available), and search by code or keyword.
  - **REQ-055-F02 Choose Individual Skill:** Elective skill enrollment dialog enforcing the architectural isolation rule (independent learning context that does **not** alter, reorder, or reset primary target role milestone pathways).
  - **REQ-055-F03 Access Mapped Learning Content:** Each catalog skill links directly to its single approved Learning Module (`/employee/modules/:moduleId`).
  - **REQ-055-F04 Independent Progress & Mastery:** Visualizes estimated mastery percentage per elective skill based on completed lessons and quizzes.

---

## 3. Navigation & Routing Integration

The following routes are registered in `frontend/src/app/App.tsx` and navbar items in `frontend/src/shared/layouts/WorkspaceLayout.tsx`:

| Actor | Route | Navigation Tab | Icon |
| :--- | :--- | :--- | :--- |
| **Employee** | `/employee/riasec` | RIASEC Profiler | `<Compass size={15} />` |
| **Employee** | `/employee/modules/:moduleId` | Module Player (from Pathway/Catalog) | `<BookOpen size={15} />` |
| **Employee** | `/employee/skills-catalog` | Skill Catalog | `<BookOpen size={15} />` |

---

## 4. Verification & Testing Evidence

- **Frontend Compilation & Bundling:** `npm run build` completed with code 0 (2,038 modules transformed, 0 TypeScript errors).
- **Unit Testing:** `npx vitest run` passed (8 test files, 30/30 tests passed).
- **Git Commit Exclusion:** Verified that `FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_1.docx.md` is strictly ignored and untracked.
