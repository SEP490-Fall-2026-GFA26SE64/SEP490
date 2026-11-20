package com.adaptlearngraph.config;

import java.util.List;
import java.util.UUID;

/** Static definitions of the demo organizations retained across demo resets. */
final class DemoOrganizationsSeedData {
    private DemoOrganizationsSeedData() {}

    enum Billing { ACTIVE, EXPIRING, EXPIRED, NONE }

    record Role(String code, String name, String scope, List<String> skills) {}
    record Job(String code, String name, List<Role> roles) {}
    record Dept(String code, String name, String description, List<Job> jobs) {}
    record Org(int number, String code, String name, String slug, String domain, String industry, String headcount,
               String country, int plan, Billing billing, boolean suspended, int employees, int experts, List<Dept> departments) {
        UUID id() { return organizationId(number); }
        boolean detailed() { return number == 1; }
    }

    static UUID organizationId(int number) {
        return UUID.fromString(String.format("5eed0000-0000-4000-8000-%012d", number));
    }

    private static Role role(String code, String name, String scope, String... skills) { return new Role(code, name, scope, List.of(skills)); }
    private static Job job(String code, String name, Role... roles) { return new Job(code, name, List.of(roles)); }
    private static Dept dept(String code, String name, String description, Job... jobs) { return new Dept(code, name, description, List.of(jobs)); }

    static final String SOFTWARE = "Software Engineering & AI";
    static final String CLOUD = "Cloud Infrastructure & DevOps";
    static final String DATA = "Data Engineering & Analytics";
    static final String SECURITY = "Cybersecurity & Network Systems";
    static final String FINTECH = "Enterprise Financial Technology";

    private static final List<Dept> SOFTWARE_DEPARTMENTS = List.of(
            dept("ENG", "Software Engineering", "Product backend and frontend delivery teams",
                    job("BACKEND-DEV", "Backend Developer",
                            role("BE-JAVA", "Java Backend Engineer", "Builds and operates Spring Boot services",
                                    "Java Core", "Spring Boot", "REST API Design", "SQL and JPA", "Microservice Patterns"),
                            role("BE-NODE", "Node.js Backend Engineer", "Builds event-driven Node.js services",
                                    "JavaScript Runtime", "Express and NestJS", "REST API Design", "Message Queues")),
                    job("FRONTEND-DEV", "Frontend Developer",
                            role("FE-REACT", "React Frontend Engineer", "Delivers accessible React interfaces",
                                    "TypeScript", "React", "CSS Architecture", "Web Performance", "Web Accessibility"))),
            dept("QA", "Quality Assurance", "Test automation and release quality",
                    job("QA-ENGINEER", "QA Engineer",
                            role("QA-AUTO", "Test Automation Engineer", "Automates functional and API regression suites",
                                    "Test Design", "Playwright Automation", "API Testing", "CI Test Pipelines"))),
            dept("AI", "AI and Data Science", "Applied machine learning for products",
                    job("ML-ENGINEER", "Machine Learning Engineer",
                            role("ML-ENG", "ML Engineer", "Trains, evaluates and deploys ML models",
                                    "Python for Data", "Machine Learning Fundamentals", "Model Deployment", "Data Pipelines"))),
            dept("PMO", "Product and Delivery", "Agile delivery and product management",
                    job("PROJECT-MANAGER", "Project Manager",
                            role("PM-AGILE", "Agile Delivery Lead", "Leads Scrum teams and delivery planning",
                                    "Scrum Practice", "Stakeholder Management", "Delivery Risk Management", "Estimation and Planning"))),
            dept("UX", "Experience Design", "Research-led product design",
                    job("UX-DESIGNER", "UX Designer",
                            role("UX-PRODUCT", "Product Designer", "Designs end-to-end product experiences",
                                    "UX Research", "Interaction Design", "Design Systems", "Usability Testing"))),
            dept("OPS", "IT Operations", "Internal platforms and developer tooling",
                    job("DEVOPS-ENGINEER", "DevOps Engineer",
                            role("DEVOPS-CICD", "CI/CD Engineer", "Owns build pipelines and environments",
                                    "Linux Administration", "Docker", "Kubernetes", "CI/CD Pipelines", "Infrastructure as Code"))));

    private static final List<Dept> CLOUD_DEPARTMENTS = List.of(
            dept("PLATFORM", "Platform Engineering", "Shared delivery platform",
                    job("DEVOPS-ENGINEER", "DevOps Engineer",
                            role("DEVOPS-CICD", "CI/CD Engineer", "Owns build pipelines and environments",
                                    "Linux Administration", "Docker", "Kubernetes", "CI/CD Pipelines", "Infrastructure as Code"))),
            dept("SRE", "Site Reliability", "Availability and incident response",
                    job("SRE", "Site Reliability Engineer",
                            role("SRE-OPS", "Production Reliability Engineer", "Keeps production services reliable",
                                    "Observability", "Incident Response", "Kubernetes", "Cloud Networking"))),
            dept("ARCH", "Cloud Architecture", "Cloud solution design",
                    job("CLOUD-ARCHITECT", "Cloud Architect",
                            role("ARCH-AWS", "AWS Solutions Architect", "Designs secure, cost-aware AWS solutions",
                                    "AWS Core Services", "Cloud Security", "Cost Optimization", "High Availability Design"))));

    private static final List<Dept> DATA_DEPARTMENTS = List.of(
            dept("DATA-ENG", "Data Engineering", "Batch and streaming data platform",
                    job("DATA-ENGINEER", "Data Engineer",
                            role("DE-PIPELINE", "Data Pipeline Engineer", "Builds reliable data pipelines",
                                    "Advanced SQL", "Apache Spark", "Workflow Orchestration", "Data Modeling"))),
            dept("BI", "Business Intelligence", "Reporting and self-service analytics",
                    job("BI-ANALYST", "BI Analyst",
                            role("BI-VISUAL", "Analytics Developer", "Builds dashboards and semantic models",
                                    "Advanced SQL", "Power BI", "Applied Statistics", "Data Storytelling"))),
            dept("DS", "Data Science", "Predictive analytics",
                    job("DATA-SCIENTIST", "Data Scientist",
                            role("DS-ML", "Applied Data Scientist", "Builds and validates predictive models",
                                    "Python for Data", "Applied Statistics", "Machine Learning Fundamentals", "Experiment Design"))));

    private static final List<Dept> SECURITY_DEPARTMENTS = List.of(
            dept("SOC", "Security Operations", "24/7 monitoring and response",
                    job("SOC-ANALYST", "SOC Analyst",
                            role("SOC-L2", "SOC Analyst Level 2", "Investigates and contains security incidents",
                                    "Network Security", "SIEM Operations", "Incident Response", "Threat Intelligence"))),
            dept("NETWORK", "Network Systems", "Enterprise network infrastructure",
                    job("NETWORK-ENGINEER", "Network Engineer",
                            role("NET-CORE", "Core Network Engineer", "Operates routing, switching and firewalls",
                                    "Routing and Switching", "Firewall Management", "Network Automation"))),
            dept("GRC", "Governance and Compliance", "Security risk and compliance",
                    job("COMPLIANCE-ANALYST", "Compliance Analyst",
                            role("GRC-ISO", "ISO 27001 Specialist", "Runs ISMS controls and audits",
                                    "ISO 27001 Controls", "Risk Assessment", "Security Auditing"))));

    private static final List<Dept> FINTECH_DEPARTMENTS = List.of(
            dept("PAYMENTS", "Payments Engineering", "Card and wallet payment rails",
                    job("PAYMENTS-ENGINEER", "Payments Engineer",
                            role("PAY-CORE", "Payment Systems Engineer", "Builds compliant payment services",
                                    "Java Core", "Payment Protocols", "PCI DSS Compliance", "Distributed Transactions"))),
            dept("RISK", "Risk and Fraud Analytics", "Fraud prevention",
                    job("FRAUD-ANALYST", "Fraud Analyst",
                            role("FRAUD-ML", "Fraud Detection Analyst", "Detects and prevents payment fraud",
                                    "Advanced SQL", "Fraud Detection Rules", "Machine Learning Fundamentals"))),
            dept("CORE-BANKING", "Core Banking", "Core ledger integration",
                    job("CORE-BANKING-DEV", "Core Banking Developer",
                            role("CB-INTEGRATION", "Core Banking Integration Developer", "Integrates core ledger services",
                                    "Banking Domain Knowledge", "Integration Patterns", "Advanced SQL"))));

    private static List<Dept> departments(String industry, int count) {
        List<Dept> all = switch (industry) {
            case CLOUD -> CLOUD_DEPARTMENTS;
            case DATA -> DATA_DEPARTMENTS;
            case SECURITY -> SECURITY_DEPARTMENTS;
            case FINTECH -> FINTECH_DEPARTMENTS;
            default -> SOFTWARE_DEPARTMENTS;
        };
        return all.subList(0, Math.min(count, all.size()));
    }

    private static Org org(int number, String code, String name, String slug, String industry, String headcount, String country,
                           int plan, Billing billing, boolean suspended, int employees, int experts, int departments) {
        return new Org(number, code, name, slug, slug + ".example.com", industry, headcount, country, plan, billing, suspended,
                employees, experts, departments(industry, departments));
    }

    static final List<Org> ORGANIZATIONS = List.of(
            org(1, "LOTUS", "Lotus Digital Solutions", "lotus-digital", SOFTWARE, "200+ employees", "VN", 2, Billing.ACTIVE, false, 46, 4, 6),
            org(2, "MEKONG", "Mekong Cloud Works", "mekong-cloud", CLOUD, "51 - 200 employees", "VN", 3, Billing.ACTIVE, false, 12, 2, 3),
            org(3, "HANOIDATA", "Hanoi Data Insights", "hanoi-data", DATA, "21 - 50 employees", "VN", 2, Billing.ACTIVE, false, 9, 1, 3),
            org(4, "REDRIVER", "Red River Cyber Defense", "red-river-cyber", SECURITY, "51 - 200 employees", "VN", 2, Billing.EXPIRING, false, 10, 2, 3),
            org(5, "SAIGONPAY", "Saigon Pay Technologies", "saigon-pay", FINTECH, "200+ employees", "VN", 3, Billing.ACTIVE, false, 14, 2, 3),
            org(6, "HALONG", "Ha Long Software House", "halong-software", SOFTWARE, "21 - 50 employees", "VN", 1, Billing.ACTIVE, false, 8, 1, 2),
            org(7, "DANANGOPS", "Da Nang DevOps Studio", "danang-devops", CLOUD, "1 - 20 employees", "VN", 1, Billing.EXPIRED, false, 5, 1, 2),
            org(8, "SINGA", "Singa Analytics Pte", "singa-analytics", DATA, "51 - 200 employees", "SG", 3, Billing.ACTIVE, false, 11, 2, 3),
            org(9, "BKKSECURE", "Bangkok SecureNet", "bangkok-securenet", SECURITY, "21 - 50 employees", "TH", 1, Billing.ACTIVE, false, 7, 1, 2),
            org(10, "KLFINCORE", "KL FinCore Systems", "kl-fincore", FINTECH, "51 - 200 employees", "MY", 2, Billing.ACTIVE, false, 10, 2, 3),
            org(11, "HUEAI", "Hue AI Lab", "hue-ai-lab", SOFTWARE, "1 - 20 employees", "VN", 1, Billing.NONE, false, 4, 1, 2),
            org(12, "CANTHO", "Can Tho AgriData", "cantho-agridata", DATA, "21 - 50 employees", "VN", 1, Billing.EXPIRING, false, 6, 1, 2),
            org(13, "TOKYOBRIDGE", "Tokyo Cloud Bridge", "tokyo-cloud-bridge", CLOUD, "200+ employees", "JP", 3, Billing.ACTIVE, false, 13, 2, 3),
            org(14, "MANILAFORGE", "Manila DevForge", "manila-devforge", SOFTWARE, "51 - 200 employees", "PH", 2, Billing.ACTIVE, false, 9, 1, 3),
            org(15, "JKTPAY", "Jakarta PayLink", "jakarta-paylink", FINTECH, "21 - 50 employees", "ID", 1, Billing.EXPIRED, false, 6, 1, 2),
            org(16, "SEOULSHIELD", "Seoul Cyber Shield", "seoul-cyber-shield", SECURITY, "51 - 200 employees", "KR", 2, Billing.ACTIVE, false, 8, 2, 3),
            org(17, "NHATRANG", "Nha Trang Smart Tourism Tech", "nhatrang-tourism-tech", SOFTWARE, "21 - 50 employees", "VN", 1, Billing.ACTIVE, false, 6, 1, 2),
            org(18, "HAIPHONG", "Hai Phong Logistics Data", "haiphong-logistics", DATA, "51 - 200 employees", "VN", 2, Billing.ACTIVE, false, 10, 1, 3),
            org(19, "VUNGTAU", "Vung Tau Energy Cloud", "vungtau-energy", CLOUD, "21 - 50 employees", "VN", 2, Billing.ACTIVE, true, 5, 1, 2),
            org(20, "BIENHOA", "Bien Hoa Manufacturing Systems", "bienhoa-manufacturing", SOFTWARE, "200+ employees", "VN", 3, Billing.ACTIVE, false, 12, 2, 4));

    private static final String[] FAMILY = {"Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Vo", "Dang", "Bui", "Do", "Ho", "Ngo", "Duong", "Ly", "Phan", "Truong"};
    private static final String[] MIDDLE = {"Van", "Thi", "Minh", "Quoc", "Thanh", "Ngoc", "Duc", "Hoang", "Gia", "Bao"};
    private static final String[] GIVEN = {"An", "Binh", "Chi", "Dung", "Giang", "Hanh", "Hieu", "Huy", "Khanh", "Lan", "Linh", "Long",
            "Mai", "Minh", "Nam", "Ngoc", "Phong", "Phuong", "Quan", "Quynh", "Son", "Tam", "Thao", "Thanh", "Trang", "Trung", "Tuan",
            "Uyen", "Vy", "Yen", "Khoa", "Nhi", "Dat", "Hai", "Tien", "Kiet", "Bao", "Ha", "Duy", "Loc", "Nhan"};

    /** Deterministic Vietnamese-style name: {family, middle, given}. */
    static String[] name(int org, int index) {
        return new String[]{FAMILY[(index * 5 + org * 3) % FAMILY.length], MIDDLE[(index * 3 + org) % MIDDLE.length],
                GIVEN[(index * 7 + org * 11) % GIVEN.length]};
    }
}
