# Seeded demo organizations — sign-in accounts

Development/demo data only. These are **not** production credentials.

- Sign in at **http://127.0.0.1:8088/login** (dev Compose stack).
- Password for **every** account below: `Password123!`
- The data is created idempotently by `DemoOrganizationsSeedBootstrap` when the API starts with the `local` + `workspace-baseline` profiles (disable with `workspace.dev-seed.enabled=false`). Restarting the API never duplicates it.
- `/reset` keeps all 20 organizations (codes `SEED-*`) and TechNova; it only removes organizations onboarded afterwards.
- Pending invitations, subscription periods and running baseline deadlines are refreshed to "now" on each API start, so their states stay realistic.
- Other seeded employees/experts use `given.family@<domain>`; look them up on each organization's Members page.

## 1. Detailed organization — Lotus Digital Solutions

Workspace `lotus-digital` · Growth plan (active) · 6 departments · 46 employees (43 active, 3 deactivated) · 4 domain experts · 8 invitations (5 pending — sent, failed delivery, not yet sent, Domain Expert invite — and 3 expired, including an L&D Manager invite).

| Role | Name | Email |
|---|---|---|
| Organization Administrator | Pham Thi Long | `admin@lotus-digital.example.com` |
| L&D Manager | Bui Thanh Quan | `ld.manager@lotus-digital.example.com` |
| Domain Expert | Ly Hoang Trung | `trung.ly@lotus-digital.example.com` |
| Domain Expert | Le Van Dat | `dat.le@lotus-digital.example.com` |
| Domain Expert | Dang Quoc Loc | `loc.dang@lotus-digital.example.com` |
| Domain Expert | Duong Duc Hanh | `hanh.duong@lotus-digital.example.com` |

Use **Organization Administrator** for the admin dashboard (members, invitations, departments/job positions, subscription) and **L&D Manager** for the development dashboard (target, baseline, review, pathway and timing states).

### Employees and their development scenario

| # | Name | Email | Department | Job position | Scenario |
|---|---|---|---|---|---|
| 1 | Vu Thi Nhan | `nhan.vu@lotus-digital.example.com` | Software Engineering | Backend Developer | No development target yet |
| 2 | Ho Thanh Hieu | `hieu.ho@lotus-digital.example.com` | Software Engineering | Frontend Developer | Target role selected, baseline not started |
| 3 | Truong Hoang Minh | `minh.truong@lotus-digital.example.com` | Quality Assurance | QA Engineer | Baseline assessment in progress |
| 4 | Hoang Van Son | `son.hoang@lotus-digital.example.com` | AI and Data Science | Machine Learning Engineer | Baseline submitted, awaiting expert review |
| 5 | Do Quoc Uyen | `uyen.do@lotus-digital.example.com` | Product and Delivery | Project Manager | Baseline result rejected/needs rework |
| 6 | Phan Duc Tien | `tien.phan@lotus-digital.example.com` | Experience Design | UX Designer | Pathway step blocked on expert action |
| 7 | Pham Bao An | `an.pham@lotus-digital.example.com` | IT Operations | DevOps Engineer | Pathway in progress (on track) |
| 8 | Bui Minh Huy | `huy.bui@lotus-digital.example.com` | Software Engineering | Backend Developer | Pathway at risk |
| 9 | Ly Ngoc Nam | `nam.ly@lotus-digital.example.com` | Software Engineering | Frontend Developer | Pathway overdue |
| 10 | Le Gia Tam | `tam.le@lotus-digital.example.com` | Quality Assurance | QA Engineer | Pathway completed on time |
| 11 | Dang Thi Vy | `vy.dang@lotus-digital.example.com` | AI and Data Science | Machine Learning Engineer | Pathway completed late |
| 12 | Duong Thanh Kiet | `kiet.duong@lotus-digital.example.com` | Product and Delivery | Project Manager | No development target yet |
| 13 | Tran Hoang Binh | `binh.tran@lotus-digital.example.com` | Experience Design | UX Designer | Target role selected, baseline not started |
| 14 | Vo Van Khanh | `khanh.vo@lotus-digital.example.com` | IT Operations | DevOps Engineer | Baseline assessment in progress |
| 15 | Ngo Quoc Ngoc | `ngoc.ngo@lotus-digital.example.com` | Software Engineering | Backend Developer | Baseline submitted, awaiting expert review |
| 16 | Nguyen Duc Thao | `thao.nguyen@lotus-digital.example.com` | Software Engineering | Frontend Developer | Baseline result rejected/needs rework |
| 17 | Vu Bao Yen | `yen.vu@lotus-digital.example.com` | Quality Assurance | QA Engineer | Pathway step blocked on expert action |
| 18 | Ho Minh Bao | `bao.ho@lotus-digital.example.com` | AI and Data Science | Machine Learning Engineer | Pathway in progress (on track) |
| 19 | Truong Ngoc Chi | `chi.truong@lotus-digital.example.com` | Product and Delivery | Project Manager | Pathway at risk |
| 20 | Hoang Gia Lan | `lan.hoang@lotus-digital.example.com` | Experience Design | UX Designer | Pathway overdue |
| 21 | Do Thi Phong | `phong.do@lotus-digital.example.com` | IT Operations | DevOps Engineer | Pathway completed on time |
| 22 | Phan Thanh Thanh | `thanh.phan@lotus-digital.example.com` | Software Engineering | Backend Developer | Pathway completed late |
| 23 | Pham Hoang Khoa | `khoa.pham@lotus-digital.example.com` | Software Engineering | Frontend Developer | No development target yet |
| 24 | Bui Van Ha | `ha.bui@lotus-digital.example.com` | Quality Assurance | QA Engineer | Target role selected, baseline not started |
| 25 | Ly Quoc Dung | `dung.ly@lotus-digital.example.com` | AI and Data Science | Machine Learning Engineer | Baseline assessment in progress |
| 26 | Le Duc Linh | `linh.le@lotus-digital.example.com` | Product and Delivery | Project Manager | Baseline submitted, awaiting expert review |
| 27 | Dang Bao Phuong | `phuong.dang@lotus-digital.example.com` | Experience Design | UX Designer | Baseline result rejected/needs rework |
| 28 | Duong Minh Trang | `trang.duong@lotus-digital.example.com` | IT Operations | DevOps Engineer | Pathway step blocked on expert action |
| 29 | Tran Ngoc Nhi | `nhi.tran@lotus-digital.example.com` | Software Engineering | Backend Developer | Pathway in progress (on track) |
| 30 | Vo Gia Duy | `duy.vo@lotus-digital.example.com` | Software Engineering | Frontend Developer | Pathway at risk |
| 31 | Ngo Thi Giang | `giang.ngo@lotus-digital.example.com` | Quality Assurance | QA Engineer | Pathway overdue |
| 32 | Nguyen Thanh Long | `long.nguyen@lotus-digital.example.com` | AI and Data Science | Machine Learning Engineer | Pathway completed on time |
| 33 | Vu Hoang Quan | `quan.vu@lotus-digital.example.com` | Product and Delivery | Project Manager | Pathway completed late |
| 34 | Ho Van Trung | `trung.ho@lotus-digital.example.com` | Experience Design | UX Designer | No development target yet |
| 35 | Truong Quoc Dat | `dat.truong@lotus-digital.example.com` | IT Operations | DevOps Engineer | Target role selected, baseline not started |
| 36 | Hoang Duc Loc | `loc.hoang@lotus-digital.example.com` | Software Engineering | Backend Developer | Baseline assessment in progress |
| 37 | Do Bao Hanh | `hanh.do@lotus-digital.example.com` | Software Engineering | Frontend Developer | Baseline submitted, awaiting expert review |
| 38 | Phan Minh Mai | `mai.phan@lotus-digital.example.com` | Quality Assurance | QA Engineer | Baseline result rejected/needs rework |
| 39 | Pham Ngoc Quynh | `quynh.pham@lotus-digital.example.com` | AI and Data Science | Machine Learning Engineer | Pathway step blocked on expert action |
| 40 | Bui Gia Tuan | `tuan.bui@lotus-digital.example.com` | Product and Delivery | Project Manager | Pathway in progress (on track) |
| 41 | Ly Thi Hai | `hai.ly@lotus-digital.example.com` | Experience Design | UX Designer | Pathway at risk |
| 42 | Le Thanh Nhan | `nhan.le@lotus-digital.example.com` | IT Operations | DevOps Engineer | Pathway overdue |
| 43 | Dang Hoang Hieu | `hieu.dang@lotus-digital.example.com` | Software Engineering | Backend Developer | Pathway completed on time |
| 44 | Duong Van Minh | `minh.duong@lotus-digital.example.com` | Software Engineering | Frontend Developer | Deactivated account (cannot sign in) |
| 45 | Tran Quoc Son | `son.tran@lotus-digital.example.com` | Quality Assurance | QA Engineer | Deactivated account (cannot sign in) |
| 46 | Vo Duc Uyen | `uyen.vo@lotus-digital.example.com` | AI and Data Science | Machine Learning Engineer | Deactivated account (cannot sign in) |

## 2. All seeded organizations

| # | Organization | Code | Plan | Billing / status | Employees | Experts | Organization Administrator | L&D Manager |
|---|---|---|---|---|---|---|---|---|
| 1 | **Lotus Digital Solutions** (detailed) | SEED-LOTUS | Growth | Active | 46 (3 deactivated) | 4 | `admin@lotus-digital.example.com` | `ld.manager@lotus-digital.example.com` |
| 2 | Mekong Cloud Works | SEED-MEKONG | Enterprise | Active | 12 | 2 | `admin@mekong-cloud.example.com` | `ld.manager@mekong-cloud.example.com` |
| 3 | Hanoi Data Insights | SEED-HANOIDATA | Growth | Active | 9 | 1 | `admin@hanoi-data.example.com` | `ld.manager@hanoi-data.example.com` |
| 4 | Red River Cyber Defense | SEED-REDRIVER | Growth | Expiring soon | 10 | 2 | `admin@red-river-cyber.example.com` | `ld.manager@red-river-cyber.example.com` |
| 5 | Saigon Pay Technologies | SEED-SAIGONPAY | Enterprise | Active | 14 | 2 | `admin@saigon-pay.example.com` | `ld.manager@saigon-pay.example.com` |
| 6 | Ha Long Software House | SEED-HALONG | Starter | Active | 8 | 1 | `admin@halong-software.example.com` | `ld.manager@halong-software.example.com` |
| 7 | Da Nang DevOps Studio | SEED-DANANGOPS | Starter | Expired | 5 | 1 | `admin@danang-devops.example.com` | `ld.manager@danang-devops.example.com` |
| 8 | Singa Analytics Pte | SEED-SINGA | Enterprise | Active | 11 | 2 | `admin@singa-analytics.example.com` | `ld.manager@singa-analytics.example.com` |
| 9 | Bangkok SecureNet | SEED-BKKSECURE | Starter | Active | 7 | 1 | `admin@bangkok-securenet.example.com` | `ld.manager@bangkok-securenet.example.com` |
| 10 | KL FinCore Systems | SEED-KLFINCORE | Growth | Active | 10 | 2 | `admin@kl-fincore.example.com` | `ld.manager@kl-fincore.example.com` |
| 11 | Hue AI Lab | SEED-HUEAI | Starter | No subscription (checkout pending) | 4 | 1 | `admin@hue-ai-lab.example.com` | `ld.manager@hue-ai-lab.example.com` |
| 12 | Can Tho AgriData | SEED-CANTHO | Starter | Expiring soon | 6 | 1 | `admin@cantho-agridata.example.com` | `ld.manager@cantho-agridata.example.com` |
| 13 | Tokyo Cloud Bridge | SEED-TOKYOBRIDGE | Enterprise | Active | 13 | 2 | `admin@tokyo-cloud-bridge.example.com` | `ld.manager@tokyo-cloud-bridge.example.com` |
| 14 | Manila DevForge | SEED-MANILAFORGE | Growth | Active | 9 | 1 | `admin@manila-devforge.example.com` | `ld.manager@manila-devforge.example.com` |
| 15 | Jakarta PayLink | SEED-JKTPAY | Starter | Expired | 6 | 1 | `admin@jakarta-paylink.example.com` | `ld.manager@jakarta-paylink.example.com` |
| 16 | Seoul Cyber Shield | SEED-SEOULSHIELD | Growth | Active | 8 | 2 | `admin@seoul-cyber-shield.example.com` | `ld.manager@seoul-cyber-shield.example.com` |
| 17 | Nha Trang Smart Tourism Tech | SEED-NHATRANG | Starter | Active | 6 | 1 | `admin@nhatrang-tourism-tech.example.com` | `ld.manager@nhatrang-tourism-tech.example.com` |
| 18 | Hai Phong Logistics Data | SEED-HAIPHONG | Growth | Active | 10 | 1 | `admin@haiphong-logistics.example.com` | `ld.manager@haiphong-logistics.example.com` |
| 19 | Vung Tau Energy Cloud | SEED-VUNGTAU | Growth | Organization **suspended** | 5 | 1 | `admin@vungtau-energy.example.com` | `ld.manager@vungtau-energy.example.com` |
| 20 | Bien Hoa Manufacturing Systems | SEED-BIENHOA | Enterprise | Active | 12 | 2 | `admin@bienhoa-manufacturing.example.com` | `ld.manager@bienhoa-manufacturing.example.com` |
