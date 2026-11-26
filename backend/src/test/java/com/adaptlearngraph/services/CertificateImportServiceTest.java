package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.CertificateCatalog.Definition;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.repository.CertificateAuthoringStore.Document;
import com.adaptlearngraph.repository.CertificateCatalogRepository.SkillChoice;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.adaptlearngraph.services.CertificateAuthoringService.Directory;
import com.adaptlearngraph.services.CertificateCatalogService.CreateInput;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** FR-CERT-01: Expert certificate Excel preview (06_Certificates_Java_Backend.xlsx, 06a conflict file). */
class CertificateImportServiceTest {
    static final String[] HEADERS = {"Skill Code", "Knowledge Level", "Certificate Name", "Description", "Reference URL"};
    static final List<String> CODES = List.of("MS-JAVA-COLL", "MS-JAVA-OOP", "MS-DB-MIGRATE", "MS-JUNIT", "MS-SPRING-DATA", "MS-SPRING-TX", "MS-SQL-INDEX", "MS-JAVA-CONC");
    CertificateAuthoringService authoring;
    CertificateImportService service;
    List<Definition> published;
    List<Document> drafts;
    boolean manager;

    @BeforeEach void setup() {
        authoring = mock(CertificateAuthoringService.class);
        service = new CertificateImportService(authoring);
        published = new ArrayList<>(); drafts = new ArrayList<>(); manager = false;
        var skills = CODES.stream().map(code -> new SkillChoice("id-" + code, code, "Skill " + code, "1.0", List.of("FOUNDATION", "INTERMEDIATE", "ADVANCED"))).toList();
        when(authoring.directory()).thenAnswer(call -> new Directory(drafts, published, skills, manager, List.of()));
    }

    static String[] row(String code, String level, String name) {
        return new String[]{code, level, name, "Description of " + name, "https://example.org/" + code.toLowerCase(Locale.ROOT)};
    }

    static byte[] workbook(String[] headers, List<String[]> rows, String formulaCell) throws Exception {
        try (var w = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            var sheet = w.createSheet("Certificates");
            var head = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) head.createCell(i).setCellValue(headers[i]);
            for (int r = 0; r < rows.size(); r++) {
                var x = sheet.createRow(r + 1);
                for (int c = 0; c < 5; c++) x.createCell(c).setCellValue(rows.get(r)[c]);
            }
            if (formulaCell != null) sheet.getRow(1).getCell(2).setCellFormula(formulaCell);
            w.write(out);
            return out.toByteArray();
        }
    }

    static MultipartFile xlsx(byte[] bytes) { return new MockMultipartFile("file", "certificates.xlsx", "application/octet-stream", bytes); }

    List<String[]> eightValidRows() {
        var rows = new ArrayList<String[]>();
        for (String code : CODES) rows.add(row(code, "Advanced", code + " Advanced Certificate"));
        return rows;
    }

    Definition definition(String code, String level, String name) {
        String[] r = row(code, level, name);
        return new Definition("def-" + code, "1", "id-" + code, "Skill " + code, KnowledgeLevel.valueOf(level.toUpperCase(Locale.ROOT)), "1.0",
                List.of(), name, r[4], "ACTIVE", "expert", "2026-11-01T00:00:00Z", r[3]);
    }

    @Test void eightValidRowsPreviewWithoutErrors() throws Exception {
        var result = service.preview(xlsx(workbook(HEADERS, eightValidRows(), null)));
        assertEquals(8, result.size());
        assertTrue(result.stream().allMatch(r -> r.error() == null && !r.alreadyExists() && r.existing() == null));
        assertEquals("ADVANCED", result.getFirst().input().knowledgeLevel());
        verify(authoring, times(8)).validate(any());
    }

    @Test void differentContentForPublishedScopeIsAConflictThatReplacesTheDefinition() throws Exception {
        published.add(definition("MS-JAVA-OOP", "Advanced", "Java OOP & SOLID Principles"));
        var result = service.preview(xlsx(workbook(HEADERS, List.<String[]>of(row("MS-JAVA-OOP", "Advanced", "Java OOP & SOLID Principles (Revision B)")), null)));
        var conflict = result.getFirst();
        assertNull(conflict.error()); assertNotNull(conflict.existing()); assertFalse(conflict.alreadyExists());
        assertEquals("def-MS-JAVA-OOP", conflict.input().replacesDefinitionId());
    }

    @Test void identicalPublishedContentIsMarkedAlreadyExisting() throws Exception {
        published.add(definition("MS-JAVA-OOP", "Advanced", "Java OOP & SOLID Principles"));
        var result = service.preview(xlsx(workbook(HEADERS, List.<String[]>of(row("MS-JAVA-OOP", "Advanced", "Java OOP & SOLID Principles")), null)));
        assertTrue(result.getFirst().alreadyExists()); assertNull(result.getFirst().error());
    }

    @Test void managerCannotPreviewImport() throws Exception {
        manager = true;
        var e = assertThrows(Failure.class, () -> service.preview(xlsx(workbook(HEADERS, eightValidRows(), null))));
        assertEquals(403, e.status()); assertEquals("EXPERT_REQUIRED", e.code());
    }

    @Test void nonXlsxAndOversizedFilesAreRejected() {
        var csv = new MockMultipartFile("file", "certificates.csv", "text/csv", "a,b".getBytes());
        var big = new MockMultipartFile("file", "certificates.xlsx", "application/octet-stream", new byte[5 * 1024 * 1024 + 1]);
        for (var file : List.of(csv, big)) {
            var e = assertThrows(Failure.class, () -> service.preview(file));
            assertEquals(400, e.status()); assertEquals("XLSX_MAX_5MB_REQUIRED", e.code());
        }
    }

    @Test void fileOfExactlyFiveMegabytesIsAccepted() throws Exception {
        byte[] bytes = workbook(HEADERS, List.<String[]>of(row("MS-JAVA-COLL", "Advanced", "Collections")), null);
        var file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(5L * 1024 * 1024);
        when(file.getOriginalFilename()).thenReturn("certificates.xlsx");
        when(file.getInputStream()).thenAnswer(call -> new ByteArrayInputStream(bytes));
        assertEquals(1, service.preview(file).size());
    }

    @Test void changedHeadersAreRejected() throws Exception {
        String[] headers = HEADERS.clone(); headers[0] = "Skill";
        var e = assertThrows(Failure.class, () -> service.preview(xlsx(workbook(headers, eightValidRows(), null))));
        assertEquals(400, e.status()); assertEquals("CERTIFICATE_HEADERS_CHANGED", e.code());
    }

    @Test void moreThanFiveHundredDataRowsAreRejected() throws Exception {
        var rows = new ArrayList<String[]>();
        for (int i = 0; i < 501; i++) rows.add(row("MS-JAVA-COLL", "Advanced", "Row " + i));
        var e = assertThrows(Failure.class, () -> service.preview(xlsx(workbook(HEADERS, rows, null))));
        assertEquals(400, e.status()); assertEquals("CERTIFICATE_TEMPLATE_REQUIRED", e.code());
    }

    @Test void unknownSkillInvalidLevelAndFormulaAreRowErrors() throws Exception {
        var unknown = service.preview(xlsx(workbook(HEADERS, List.<String[]>of(row("MS-UNKNOWN", "Advanced", "X")), null))).getFirst();
        assertTrue(unknown.error().startsWith("Unknown Certificate-mode Skill Code"));
        var level = service.preview(xlsx(workbook(HEADERS, List.<String[]>of(row("MS-JAVA-COLL", "Expert", "X")), null))).getFirst();
        assertTrue(level.error().startsWith("Invalid Knowledge Level"));
        var formula = service.preview(xlsx(workbook(HEADERS, List.<String[]>of(row("MS-JAVA-COLL", "Advanced", "X")), "CONCAT(\"A\",\"B\")"))).getFirst();
        assertTrue(formula.error().startsWith("Formulas are not supported"));
    }

    @Test void createInputCarriesTheImportedFields() throws Exception {
        var input = service.preview(xlsx(workbook(HEADERS, List.<String[]>of(row("MS-JUNIT", "Intermediate", "JUnit")), null))).getFirst().input();
        assertEquals(new CreateInput("id-MS-JUNIT", "INTERMEDIATE", "JUnit", "https://example.org/ms-junit", "1.0", null, "Description of JUnit"), input);
    }
}
