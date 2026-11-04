# Capstone Project Report

# Report 1 - Project Introduction

**Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform**

**Adapt-Learn-Graph**

**Review 2 | November 2026**

---

## I. Record of Changes

| Date | A*M, D | In charge | Change Description |
| --- | --- | --- | --- |
| 01 November 2026 | A | Report preparation | Created the English project introduction for Review 2 using the Report 1 template, approved project registration, product documentation, and publicly available research and product information. |

*A - Added; M - Modified; D - Deleted.*

---

## II. Project Introduction

### 1. Overview

#### 1.1 Project Information

- **Project name:** Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform.
- **Vietnamese project name:** Nền tảng học tập thích ứng và phát triển năng lực cá nhân dựa trên biểu đồ tri thức.
- **Project code:** Adapt-Learn-Graph, the abbreviation recorded in the project registration. The registration document is identified as FA26SE267; it does not separately specify a product code.
- **Group name:** Adapt-Learn-Graph capstone project team. A formal group identifier is not stated in the project registration.
- **Software type:** Subscription-based web application for organizational learning and employee competency development.
- **Project period:** September 2026 to March 2027.
- **Primary application area:** Corporate Learning and Development (L&D), with an initial demonstration focused on Software Engineering competencies.

Adapt-Learn-Graph is proposed to help organizations connect three questions: what a role requires, what an employee can currently demonstrate, and what the employee should learn next. It brings role requirements, assessments, learning materials, and development progress into a shared organizational workspace. Each organization manages its own people and content, while employees receive learning guidance relevant to their development needs.[^P1][^P2]

In business terms, the product's "knowledge graph" is a connected map of roles, skills, and learning resources. "Adaptive learning" means that an employee's recommended learning route can change as new assessment results become available. These capabilities are intended to make development more focused, understandable, and responsive than assigning the same fixed learning sequence to everyone.

This report describes the proposed product and its intended scope. It is not a statement that every feature is complete, commercially available, or proven to improve workplace performance. Current documentation distinguishes working capabilities from partial implementations, demonstrations, and areas still requiring verification.[^P3]

#### 1.2 Project Team

The following information is reproduced from the project registration. No additional contact details or team appointments have been inferred.[^P1]

| Full Name | Role | Email | Mobile |
| --- | --- | --- | --- |
| Hoàng Thu Hà | Supervisor / Lecturer | haht43@fpt.edu.vn | Not provided in the registration |
| Đặng Minh Hoàng | Team Leader | Hoangsusp@gmail.com | 0979091813 |
| Nguyễn Trần Việt An | Member | AnNTVSE184889@fpt.edu.vn | 0774477767 |
| Nguyễn Anh Khôi | Member | khoinguyenanh205@gmail.com | 0909642416 |
| Trần An Quốc | Member | QuocTASE182280@fpt.edu.vn | 0357557029 |

### 2. Product Background

Organizations need employees to develop as their work changes. New tools, changing responsibilities, and different business priorities can alter the skills required for a role. The International Labour Organization (ILO) reports that digitalization has a considerable impact on jobs and skills across countries and sectors, and identifies the need for skills and lifelong learning systems to respond to technological and structural change.[^W1] This provides a broader rationale for development systems that can respond to changing needs rather than simply distribute a fixed course catalogue.

The project registration identifies a related problem in corporate training: learning activities may be organized around standard course sequences without sufficiently connecting them to each employee's existing capabilities or the requirements of a target role.[^P1] For example, two employees preparing for the same role may receive the same training even though one already understands several topics and the other needs additional foundational knowledge. This is an illustrative scenario, not a finding from a customer survey.

Several practical difficulties follow from the situation described in the proposal:

1. **Learning may not address the right gap.** Completing a course does not, by itself, explain which role-related capabilities an employee has demonstrated or still needs to develop.
2. **Assessment and learning decisions may remain disconnected.** A test can identify a weakness, but someone must still determine which learning resources address it.
3. **Employees may repeat familiar material.** A fixed sequence may include topics they already know, while offering insufficient support for the areas they find difficult.
4. **Learning order may be unclear.** Some skills depend on earlier knowledge. Recommending advanced material without considering those foundations can make development harder to follow.
5. **Managers may lack a consolidated development picture.** Course attendance and completion records alone do not fully explain progress toward a role or the financial basis of a training initiative.

These are problems the project aims to address; they should not be interpreted as limitations shared by every existing learning platform. Contemporary products already offer personalization, skill intelligence, and business-oriented reporting, as discussed in Section 3.[^W2][^W3][^W4]

Adapt-Learn-Graph responds by connecting assessment evidence to role requirements and relevant learning modules. Employees are intended to see their current competency profile, understand the gaps associated with a selected role, and follow a recommended sequence of learning activities. Subject-matter Experts review the initial pathway, while later assessment results can update the remaining recommendations. L&D Managers retain responsibility for approving role configurations and learning offerings.[^P1]

The initiative is an academic capstone project documented by a four-student team under the supervision of Hoàng Thu Hà. Its intended organizational customers are those responsible for employee learning and development; its day-to-day users include administrators, L&D Managers, Experts, and Employees. The registration does not identify a contracted external customer or provide evidence of customer interviews. Accordingly, the report presents a documented problem proposal and prospective users rather than claiming confirmed customer demand.[^P1]

### 3. Existing Systems

The following products were reviewed through their official public websites on 01 November 2026. Their descriptions summarize vendor-published capabilities, not independently tested performance. The strengths and limitations below concern their relevance to this capstone project; an undocumented capability is not treated as an absent capability.

#### 3.1 Degreed

**Official links:** [Degreed Learning](https://degreed.com/experience/lxp/) and [Degreed Skills+](https://degreed.com/experience/skills/).

**Brief description:** Degreed provides a learning experience platform that brings formal and informal learning together. Its Learning product describes personalized recommendations, skill plans, pathways, and reporting. Skills+ focuses on consistent skill definitions, proficiency descriptions, and the normalization of skill information across systems.[^W2][^W3]

**Main actors:** Employees and learners, L&D teams, administrators, and people responsible for organizational skill frameworks. These are business user groups inferred from the published use cases, not a verified list of product permission roles.

**Relevant features:**

- Personalized learning recommendations based on roles, skills, interests, and learning history.
- Learning plans and pathways supporting onboarding, upskilling, and reskilling.
- Connections between existing learning, content, HR, and talent systems.
- Skill definitions and proficiency descriptions that organizations can customize.
- Skill and learning analytics, including reporting on progression.
- Human review and approval of AI-recommended skill descriptions and content tags.

**Pros:**

- Demonstrates that learning can be organized around skill development rather than only course completion.
- Connects learning resources and skill information across an existing organizational learning environment.
- Provides useful reference points for employee personalization and organizational control over skill definitions.

**Cons / limitations for this project:**

- Its broad enterprise ecosystem extends beyond the capstone's bounded demonstration and internal sample content.
- The reviewed pages do not provide sufficient detail to independently reproduce its recommendation decisions or verify the exact prerequisite-aware, assessment-driven pathway workflow proposed here.
- No like-for-like cost or effectiveness comparison was conducted. The project therefore cannot claim that Degreed is less affordable or less effective.

**Lessons for Adapt-Learn-Graph:** Make development guidance relevant to individual employees, keep skill terminology consistent, and let organizational Experts define what proficiency means. Degreed also demonstrates that personalization and skills graphs are established market capabilities; they should not be presented as unique inventions of this project.[^W2][^W3]

#### 3.2 Docebo

**Official link:** [Docebo](https://www.docebo.com/).

**Brief description:** Docebo describes its offering as an AI Workforce Readiness Platform combining learning management with skills and talent intelligence. Its public information includes skill-gap identification, targeted learning, assessments, and analytics connecting capability development with business outcomes.[^W4]

**Main actors:** Employees and other learners, learning administrators, L&D teams, and organizational leaders. The wider product also supports customer and partner learning. These are user groups described or implied by its public use cases, not a verified access-control model.

**Relevant features:**

- Learning management, learning plans, assessments, certifications, and compliance automation.
- Skills intelligence, gap analysis, and personalized development.
- AI-supported recommendations, learner assistance, and content creation.
- Analytics linking learning and capability information with business measures.
- Integrations with HR, identity, collaboration, content, and business systems.
- Support for different audiences, including employees, customers, and partners.

**Pros:**

- Shows how learning, skill information, and organizational outcomes can be considered together.
- Offers a broad reference for learning administration, assessment, and reporting.
- Recognizes that measuring capability requires more than counting training activities.

**Cons / limitations for this project:**

- Its multi-audience, enterprise-wide scope is much broader than the planned Software Engineering demonstration.
- Capabilities such as compliance certification and AI content creation are outside this project's approved scope.
- Public descriptions alone do not establish whether its pathway decisions follow the same detailed workflow or evaluation approach proposed for Adapt-Learn-Graph.
- Pricing, operational effort, and comparative learning outcomes were not independently evaluated.

**Lessons for Adapt-Learn-Graph:** Bring learning and development information into a coherent experience, report progress in terms meaningful to managers, and avoid equating course completion with demonstrated competence. The project can learn from Docebo's business orientation without attempting to reproduce its full commercial feature set.[^W4]

**Comparative conclusion:** Both products already address parts of the problem space. Adapt-Learn-Graph's proposed contribution is a focused, evaluable workflow that links organization-defined role requirements, assessment-supported skill gaps, prerequisite-aware module selection, initial Expert review, and subsequent pathway updates. Whether that workflow produces better recommendations must be established through project evaluation, not assumed from the comparison.[^P1]

### 4. Business Opportunity

The business opportunity is to help organizations turn training needs into more focused employee development decisions. The ILO's discussion of changing skill demands supports the need for learning systems that respond to ongoing workplace change.[^W1] Degreed and Docebo show that personalized learning and skills-based development are already part of the commercial market.[^W2][^W3][^W4] Together, these sources support the relevance of the problem, but they do not establish market size, willingness to pay, or demand for this particular product.

The initial target environment is an organization developing Software Engineering employees through internally managed roles, skills, and learning materials. The prospective buyer or sponsor is the organization responsible for training, with an L&D Manager overseeing development and an organization administrator managing access and subscriptions. Employees benefit from clearer learning direction, while Experts contribute the subject knowledge needed to make recommendations appropriate to the organization's work.

The proposed product is attractive because it aims to make one development cycle visible and manageable:

**Define a target role -> assess current capabilities -> identify gaps -> recommend and review learning -> assess again -> update the remaining pathway.**

This cycle can also be coordinated manually or supported by existing products. The opportunity is therefore not a problem that is impossible to solve without Adapt-Learn-Graph, but a chance to reduce fragmentation and make the relationship between learning choices and role requirements clearer within a bounded organizational workspace.

The intended value for stakeholders includes:

| Stakeholder | Current decision or difficulty | Intended value |
| --- | --- | --- |
| Employee | Understanding what to learn next and why | A visible competency profile and a learning route connected to a chosen role. |
| Expert | Translating role expectations into appropriate learning | Structured skill requirements, prerequisite relationships, content mapping, and initial pathway review. |
| L&D Manager | Prioritizing development and overseeing quality | Role and content approval, employee and department summaries, and visibility into development gaps. |
| Organization administrator | Managing access and the organization's use of the service | A private workspace with account management, subscription information, and Employee-seat controls. |
| Platform Administrator | Operating the service across organizations | Organization, subscription, workspace-status, and platform-activity oversight. |

The subscription-based model allows an organization to register, select an available plan, pay, and obtain a workspace with an allocated number of Employee seats. Renewal and seat visibility are included in the proposed service lifecycle.[^P1] This is a planned delivery model, not evidence of existing revenue or validated commercial pricing.

For L&D teams, reporting is intended to connect learning progress with recorded training costs and monetary benefits. Such information could support more transparent investment discussions. However, financial return depends on the quality and attribution of those records; improved assessment scores do not automatically establish a monetary benefit. No savings, return-on-investment percentage, or productivity improvement is claimed in this report.

The capstone's immediate opportunity is to demonstrate and evaluate a focused development workflow. A later commercial offering would require customer validation, evidence from real learners, operational readiness, and a sustainable support model. It should not be positioned as a proven replacement for established learning platforms at this stage.

### 5. Software Product Vision

For organizations that need to develop employees toward clearly defined roles, **Adapt-Learn-Graph** is a web-based learning and competency development platform that connects role expectations, assessment evidence, and learning resources in a private organizational workspace. It helps employees understand their development gaps and follow a personalized learning pathway, gives Experts responsibility for reviewing initial recommendations, and enables L&D Managers to oversee content quality and development progress.

Unlike an isolated course catalogue or a manually maintained training plan, the proposed product is intended to keep learning recommendations connected to what an employee has demonstrated and what the selected role requires, updating the remaining pathway as assessment evidence changes. Its vision is to make employee development **more focused, explainable, and responsive**, while retaining human oversight and realistic limits on what assessment data can establish.[^P1]

### 6. Project Scope & Limitations

The project covers a subscription-based web platform serving six human actors: Guest, Platform Administrator, System Administrator, L&D Manager, Expert, and Employee. In this report, the **System Administrator** is the organization's workspace administrator. Automated services support these users but are not a seventh human actor.[^P1][^P2]

The initial application and evaluation are bounded to Software Engineering competencies and representative data for at least two separate demonstration organizations. Features below summarize the intended product scope; they do not indicate that every capability has been implemented or accepted.

#### 6.1 Major Features

1. **FE-01: Self-service organization onboarding.** Allow a Guest to register an organization, create and verify an administrator account, resume an incomplete registration, and track payment and workspace setup before entering the workspace.

2. **FE-02: Subscription purchase and renewal.** Allow organizations to compare existing plans, select a plan, complete payment, check payment status, retry unsuccessful payments, and renew. Show the paid period, payment history, and allocated and used Employee seats.

3. **FE-03: Platform administration.** Allow the Platform Administrator to manage organization information, review workspace and subscription status, suspend or reactivate workspaces, update existing subscription plans, and monitor platform activity.

4. **FE-04: Organization workspace administration.** Allow the System Administrator to manage user accounts and memberships, roles and permissions, departments, organization profile details, workspace settings, and relevant activity records.

5. **FE-05: Job Position and Expert assignment management.** Allow the L&D Manager to organize job positions within departments and assign Experts responsible for the relevant competency and learning content.

6. **FE-06: Target role definition and publication.** Allow the L&D Manager to create and assign target roles, Experts to configure their competency requirements and submit them, and the L&D Manager to publish approved roles or return them for revision.

7. **FE-07: Skill and prerequisite management.** Allow assigned Experts to maintain specific skills, proficiency expectations, and prerequisite relationships so that learning recommendations reflect the knowledge needed before progressing.

8. **FE-08: Learning modules, content, and approval.** Allow Experts to organize modules, map them to skills, maintain learning materials and module assessment questions, and submit learning offerings to the L&D Manager for approval or revision.

9. **FE-09: Baseline and module assessments.** Allow the L&D Manager to configure baseline assessment coverage and rules, Experts to maintain module assessments, and Employees to complete assessments. Evaluate submitted answers to provide evidence for competency estimates.

10. **FE-10: Interest assessment and target role guidance.** Allow Employees to complete a RIASEC career-interest assessment, view AI-assisted role suggestions and explanations, and select or confirm a published role. Interests inform guidance; they do not establish skill mastery or determine a role on the employee's behalf.

11. **FE-11: Employee profiles and skill-gap visibility.** Allow Employees to maintain their profiles and see their estimated current competencies and the gaps between those competencies and a selected target role.

12. **FE-12: Personalized pathways with Expert review and adaptation.** Recommend modules that address identified gaps and prerequisite needs. Allow an Expert to review, include or exclude suggested modules, and confirm the initial pathway. Recalculate the remaining pathway as later assessment results update competency estimates.

13. **FE-13: Pathway learning, independent skill learning, and progress tracking.** Allow Employees to access approved learning materials through their pathways or by selecting individual skills, complete module assessments, and review completed activities, assessment outcomes, competency progress, and pathway status.

14. **FE-14: Employee and department development reporting.** Allow the L&D Manager to review competency profiles, gaps, assessment outcomes, and learning progress, with department, job position, and reporting-period filters. Support recorded training costs and monetary benefits as the basis for training ROI summaries.

15. **FE-15: Protected workspaces, notifications, and activity history.** Restrict functions and learning content to authorized users in the appropriate organization. Send verification, payment, and workflow emails, and record important administrative, payment, assessment, content, and pathway events.

Together, these features summarize the registration's 48 functional requirements. The project is also expected to deliver representative demonstration content, a working web application, documented evaluation results, source code, user guidance, and supporting project documentation.[^P1][^P2]

#### 6.2 Limitations & Exclusions

1. **LI-01: A bounded proof of concept, not a complete commercial LMS.** The capstone demonstrates learning and competency workflows with an initial Software Engineering focus. It is not intended to immediately replace a fully featured commercial learning platform or claim coverage of every industry and job position.

2. **LI-02: Representative content rather than a production course library.** Sample documents, text materials, learning modules, and assessment questions are included to demonstrate the workflows. Producing a comprehensive curriculum, professionally recorded courses, or detailed commercial course syllabi is outside scope.

3. **LI-03: No dedicated video-streaming infrastructure or SCORM compliance.** Demonstrating access to sample learning materials does not include building a professional streaming service or implementing the SCORM e-learning interoperability standard.

4. **LI-04: AI content creation is excluded.** AI-assisted target role guidance is included, but generating instructional courses, videos, or assessment content through generative AI is not part of the approved research scope.

5. **LI-05: Recommendations depend on the organization's knowledge and content.** The platform can recommend only from the role definitions, skill relationships, assessment information, and available modules represented in its workspace. Incomplete mappings or poor-quality content can reduce the usefulness of a pathway.

6. **LI-06: Assessment evidence is not complete proof of workplace competence.** Competency profiles are estimates based on the configured assessments and accumulated evidence. They are not professional certifications or guarantees that an employee will perform a role successfully in practice.

7. **LI-07: Role guidance supports employee choice.** RIASEC results describe interests, not ability. AI suggestions do not guarantee career suitability, replace organizational judgment, or make employment, promotion, or placement decisions.

8. **LI-08: Human review remains part of the workflow.** Experts review the initial pathway, and L&D Managers approve role publication and learning offerings. The product does not remove the need for qualified people to maintain learning quality and role requirements.

9. **LI-09: Evaluation does not establish real-world business outcomes.** Planned evaluation uses curated or synthetic data, Expert annotations, and simulated learner behavior. Recommendation relevance and pathway-efficiency results cannot, by themselves, prove employee productivity gains, retention improvements, or business savings.

10. **LI-10: ROI is dependent on recorded financial inputs.** Reporting uses entered training costs and monetary benefits with their period, currency, and supporting basis. It does not independently prove that training caused a business improvement or derive monetary benefits from quiz scores.

11. **LI-11: Commercial-platform integrations are not part of the defined deliverables.** The approved scope includes subscription payments, email notifications, and internal workspace learning content. It does not establish delivery commitments for external HR systems, commercial content catalogues, talent marketplaces, or other vendors' learning platforms.

12. **LI-12: Demonstration readiness is not production readiness.** Separate demonstration workspaces and local evaluation do not certify operation at commercial scale. End-to-end verification, external-service operation, security, recovery, and performance must be assessed against documented acceptance criteria before broader deployment. Current implementation notes remain distinct from the proposed scope described here.[^P3]

These boundaries preserve the project's intended contribution: demonstrating and evaluating a connected, assessment-informed employee development workflow within the resources and period of a student capstone.[^P1]

---

[^P1]: Project team. *Capstone Project Register, Version 2: Knowledge Graph-Based Adaptive Learning and Competency Intelligence Platform*. Internal project source, registration dated 18 October 2026. Used for the project name, team, period, proposal, functional scope, deliverables, and research exclusions. [Project registration](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md).

[^P2]: Project team. *Adapt-Learn-Graph: Product Overview*. Scope alignment dated 28 October 2026. Used for the six human actors and the distribution of 48 functional requirements. [Product overview](../PRODUCT_OVERVIEW.md).

[^P3]: Project team. *Functional Requirements Catalog*. Includes dated implementation snapshots and verification boundaries. Used only to distinguish proposed functionality from completed or verified delivery. [Functional requirements catalog](../features/README.md).

[^W1]: International Labour Organization. *Changing demand for skills in digital economies and societies: Literature review and case studies from low- and middle-income countries*. Published 9 December 2021; public publication summary accessed 01 November 2026. Used for the context of digitalization, changing skill demands, and lifelong learning; no findings beyond the accessible summary are asserted. [ILO publication](https://www.ilo.org/publications/changing-demand-skills-digital-economies-and-societies-literature-review).

[^W2]: Degreed. *Degreed Learning*. Official product page; accessed 01 November 2026. Used for published learning personalization, pathways, ecosystem connections, and analytics capabilities. Vendor descriptions are not independently verified outcomes. [Degreed Learning](https://degreed.com/experience/lxp/).

[^W3]: Degreed. *Skills and Skill Data: Skills+*. Official product page; accessed 01 November 2026. Used for skill definitions, proficiency customization, normalization, content tagging, and human review controls. [Degreed Skills+](https://degreed.com/experience/skills/).

[^W4]: Docebo. Official platform overview and product FAQ; accessed 01 November 2026. Used for published learning management, skills intelligence, assessments, business-oriented analytics, and audience coverage. Vendor descriptions are not independently verified outcomes. [Docebo](https://www.docebo.com/).
