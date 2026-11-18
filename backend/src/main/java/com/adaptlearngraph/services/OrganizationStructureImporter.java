package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.RegistrationDto;
import com.adaptlearngraph.dtos.RegistrationDto.OrganizationStructureRequest;
import com.adaptlearngraph.entities.domain.OrganizationStructure;
import com.adaptlearngraph.exception.OrganizationStructureInvalid;
import com.adaptlearngraph.exception.OrganizationStructureInvalid.RowError;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Validates and normalizes a Guest-uploaded organization structure workbook with four data sheets: Departments,
 * Job positions (referencing a department code), Roles (referencing a job position code) and Levels (referencing
 * a role code). Codes are case-insensitive and unique per sheet; every branch must reach at least one level.
 * Any error rejects the whole workbook.
 */
public final class OrganizationStructureImporter {
    public static final int MAX_ROWS = RegistrationDto.MAX_STRUCTURE_ROWS;
    public static final int MAX_NAME = 120;
    public static final int MAX_TEXT = 1000;
    public static final int MAX_CODE = 64;
    public static final int MAX_RANK = 99;
    private static final int MAX_ERRORS = 200;
    private static final Pattern CODE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]*");

    public static final String DEPARTMENTS = "Departments";
    public static final String JOB_POSITIONS = "Job positions";
    public static final String TARGET_ROLES = "Roles";
    public static final String LEVELS = "Levels";

    static final String DEPARTMENT_CODE = "Department code";
    static final String DEPARTMENT_NAME = "Department name";
    static final String DEPARTMENT_DESCRIPTION = "Department description";
    static final String JOB_POSITION_CODE = "Job position code";
    static final String JOB_POSITION_NAME = "Job position name";
    static final String TARGET_ROLE_CODE = "Role code";
    static final String TARGET_ROLE_NAME = "Role name";
    static final String TARGET_ROLE_SCOPE = "Role scope";
    static final String LEVEL_NAME = "Level name";
    static final String LEVEL_RANK = "Level rank";

    private OrganizationStructureImporter() {
    }

    public static RegistrationDto.OrganizationStructureView preview(OrganizationStructureRequest input) {
        return view(validate(input));
    }

    public static RegistrationDto.OrganizationStructureView view(OrganizationStructure structure) {
        return new RegistrationDto.OrganizationStructureView(structure.departmentCount(), structure.jobPositionCount(),
                structure.targetRoleCount(), structure.levelCount(), structure.departments().stream().map(d ->
                new RegistrationDto.StructureDepartmentView(d.code(), d.name(), d.description(), d.jobPositions().stream().map(j ->
                        new RegistrationDto.StructureJobPositionView(j.code(), j.name(), j.targetRoles().stream().map(r ->
                                new RegistrationDto.StructureTargetRoleView(r.code(), r.name(), r.scope(), r.levels().stream().map(l ->
                                        new RegistrationDto.StructureLevelView(l.code(), l.name(), l.rank())).toList())).toList()))
                        .toList())).toList());
    }

    public static OrganizationStructure validate(OrganizationStructureRequest input) {
        if (input == null || input.isEmpty())
            throw new OrganizationStructureInvalid(List.of(new RowError(null, 0, null, "The workbook has no data rows.")));
        var departmentsIn = orEmpty(input.departments());
        var jobsIn = orEmpty(input.jobPositions());
        var rolesIn = orEmpty(input.targetRoles());
        var levelsIn = orEmpty(input.levels());
        var limits = new ArrayList<RowError>();
        limit(DEPARTMENTS, departmentsIn.size(), limits);
        limit(JOB_POSITIONS, jobsIn.size(), limits);
        limit(TARGET_ROLES, rolesIn.size(), limits);
        limit(LEVELS, levelsIn.size(), limits);
        if (!limits.isEmpty()) throw new OrganizationStructureInvalid(limits);

        var errors = new Errors();
        var departments = new LinkedHashMap<String, Dept>();
        for (int i = 0; i < departmentsIn.size(); i++) {
            var raw = departmentsIn.get(i);
            int row = rowOf(raw == null ? null : raw.row(), i);
            if (raw == null) { errors.add(DEPARTMENTS, row, null, "The row is empty."); continue; }
            int before = errors.size();
            String code = code(DEPARTMENTS, row, DEPARTMENT_CODE, raw.code(), errors);
            String name = text(DEPARTMENTS, row, DEPARTMENT_NAME, raw.name(), MAX_NAME, false, errors);
            String description = text(DEPARTMENTS, row, DEPARTMENT_DESCRIPTION, raw.description(), MAX_TEXT, true, errors);
            if (errors.size() > before) continue;
            var existing = departments.get(key(code));
            if (existing != null) errors.add(DEPARTMENTS, row, DEPARTMENT_CODE,
                    "Department code " + code + " is already used in row " + existing.row + ".");
            else departments.put(key(code), new Dept(row, code, name, description));
        }

        var jobs = new LinkedHashMap<String, Job>();
        for (int i = 0; i < jobsIn.size(); i++) {
            var raw = jobsIn.get(i);
            int row = rowOf(raw == null ? null : raw.row(), i);
            if (raw == null) { errors.add(JOB_POSITIONS, row, null, "The row is empty."); continue; }
            int before = errors.size();
            String parentCode = code(JOB_POSITIONS, row, DEPARTMENT_CODE, raw.departmentCode(), errors);
            String code = code(JOB_POSITIONS, row, JOB_POSITION_CODE, raw.code(), errors);
            String name = text(JOB_POSITIONS, row, JOB_POSITION_NAME, raw.name(), MAX_NAME, false, errors);
            if (errors.size() > before) continue;
            var parent = departments.get(key(parentCode));
            if (parent == null) {
                errors.add(JOB_POSITIONS, row, DEPARTMENT_CODE, "Department code " + parentCode + " is not defined in the Departments sheet.");
                continue;
            }
            var existing = jobs.get(key(code));
            if (existing != null) {
                errors.add(JOB_POSITIONS, row, JOB_POSITION_CODE, "Job position code " + code + " is already used in row " + existing.row + ".");
                continue;
            }
            var job = new Job(row, code, name);
            jobs.put(key(code), job);
            parent.jobs.add(job);
        }

        var roles = new LinkedHashMap<String, Role>();
        for (int i = 0; i < rolesIn.size(); i++) {
            var raw = rolesIn.get(i);
            int row = rowOf(raw == null ? null : raw.row(), i);
            if (raw == null) { errors.add(TARGET_ROLES, row, null, "The row is empty."); continue; }
            int before = errors.size();
            String parentCode = code(TARGET_ROLES, row, JOB_POSITION_CODE, raw.jobPositionCode(), errors);
            String code = code(TARGET_ROLES, row, TARGET_ROLE_CODE, raw.code(), errors);
            String name = text(TARGET_ROLES, row, TARGET_ROLE_NAME, raw.name(), MAX_NAME, false, errors);
            String scope = text(TARGET_ROLES, row, TARGET_ROLE_SCOPE, raw.scope(), MAX_TEXT, true, errors);
            if (errors.size() > before) continue;
            var parent = jobs.get(key(parentCode));
            if (parent == null) {
                errors.add(TARGET_ROLES, row, JOB_POSITION_CODE, "Job position code " + parentCode + " is not defined in the Job positions sheet.");
                continue;
            }
            var existing = roles.get(key(code));
            if (existing != null) {
                errors.add(TARGET_ROLES, row, TARGET_ROLE_CODE, "Role code " + code + " is already used in row " + existing.row + ".");
                continue;
            }
            var role = new Role(row, code, name, scope);
            roles.put(key(code), role);
            parent.roles.add(role);
        }

        for (int i = 0; i < levelsIn.size(); i++) {
            var raw = levelsIn.get(i);
            int row = rowOf(raw == null ? null : raw.row(), i);
            if (raw == null) { errors.add(LEVELS, row, null, "The row is empty."); continue; }
            int before = errors.size();
            String parentCode = code(LEVELS, row, TARGET_ROLE_CODE, raw.targetRoleCode(), errors);
            String name = text(LEVELS, row, LEVEL_NAME, raw.name(), MAX_NAME, false, errors);
            Integer rank = rank(row, raw.rank(), errors);
            if (errors.size() > before) continue;
            var parent = roles.get(key(parentCode));
            if (parent == null) {
                errors.add(LEVELS, row, TARGET_ROLE_CODE, "Role code " + parentCode + " is not defined in the Roles sheet.");
                continue;
            }
            var sameName = parent.levelsByName.get(key(name));
            var sameRank = parent.levelsByRank.get(rank);
            if (sameName != null) errors.add(LEVELS, row, LEVEL_NAME, "Level \"" + name + "\" is already defined for role "
                    + parent.code + " in row " + sameName.row + ".");
            else if (sameRank != null) errors.add(LEVELS, row, LEVEL_RANK, "Rank " + rank + " of role " + parent.code
                    + " is already used by level \"" + sameRank.name + "\" in row " + sameRank.row + ".");
            else {
                var level = new Lvl(row, name, rank);
                parent.levelsByName.put(key(name), level);
                parent.levelsByRank.put(rank, level);
            }
        }

        if (errors.isEmpty()) {
            if (departments.isEmpty()) errors.add(DEPARTMENTS, 0, null, "Add at least one department.");
            for (var department : departments.values()) if (department.jobs.isEmpty())
                errors.add(DEPARTMENTS, department.row, DEPARTMENT_CODE, "Department " + department.code
                        + " has no job positions. Add at least one in the Job positions sheet.");
            for (var job : jobs.values()) if (job.roles.isEmpty())
                errors.add(JOB_POSITIONS, job.row, JOB_POSITION_CODE, "Job position " + job.code
                        + " has no roles. Add at least one in the Roles sheet.");
            for (var role : roles.values()) if (role.levelsByRank.isEmpty())
                errors.add(TARGET_ROLES, role.row, TARGET_ROLE_CODE, "Role " + role.code
                        + " has no levels. Add at least one in the Levels sheet.");
        }
        if (!errors.isEmpty()) throw new OrganizationStructureInvalid(errors.list);

        return new OrganizationStructure(departments.values().stream().map(d -> new OrganizationStructure.Department(
                d.code, d.name, d.description, d.jobs.stream().map(j -> new OrganizationStructure.JobPosition(j.code, j.name,
                        j.roles.stream().map(r -> new OrganizationStructure.TargetRole(r.code, r.name, r.scope,
                                r.levelsByRank.values().stream().sorted(Comparator.comparingInt(Lvl::rank))
                                        .map(l -> new OrganizationStructure.Level("L" + l.rank, l.name, l.rank)).toList()))
                                .toList())).toList())).toList());
    }

    private static <T> List<T> orEmpty(List<T> rows) {
        return rows == null ? List.of() : rows;
    }

    private static void limit(String sheet, int size, List<RowError> errors) {
        if (size > MAX_ROWS) errors.add(new RowError(sheet, 0, null,
                "The " + sheet + " sheet has " + size + " data rows; at most " + MAX_ROWS + " are allowed."));
    }

    /** Header is row 1, so the first data row defaults to row 2. */
    private static int rowOf(Integer row, int index) {
        return row == null || row < 2 ? index + 2 : row;
    }

    private static String key(String value) {
        return value.toUpperCase(Locale.ROOT);
    }

    private static String text(String sheet, int row, String column, String value, int max, boolean multiline, Errors errors) {
        String text = value == null ? "" : multiline ? value.strip() : value.strip().replaceAll("\\s+", " ");
        if (text.isEmpty()) errors.add(sheet, row, column, column + " is required.");
        else if (text.length() > max) errors.add(sheet, row, column, column + " must be at most " + max + " characters.");
        return text;
    }

    private static String code(String sheet, int row, String column, String value, Errors errors) {
        String code = value == null ? "" : value.strip();
        if (code.isEmpty()) errors.add(sheet, row, column, column + " is required.");
        else if (code.length() > MAX_CODE) errors.add(sheet, row, column, column + " must be at most " + MAX_CODE + " characters.");
        else if (!CODE.matcher(code).matches())
            errors.add(sheet, row, column, column + " may contain only letters, digits, '.', '_' and '-'.");
        return code;
    }

    private static Integer rank(int row, String value, Errors errors) {
        String text = value == null ? "" : value.strip();
        if (text.isEmpty()) {
            errors.add(LEVELS, row, LEVEL_RANK, LEVEL_RANK + " is required.");
            return null;
        }
        // Spreadsheet numbers may arrive as "2.0".
        if (text.matches("\\d{1,3}(\\.0+)?")) {
            int rank = Integer.parseInt(text.replaceAll("\\.0+$", ""));
            if (rank >= 1 && rank <= MAX_RANK) return rank;
        }
        errors.add(LEVELS, row, LEVEL_RANK, LEVEL_RANK + " must be a whole number from 1 to " + MAX_RANK + ".");
        return null;
    }

    private static final class Errors {
        final List<RowError> list = new ArrayList<>();

        void add(String sheet, int row, String column, String message) {
            if (list.size() < MAX_ERRORS) list.add(new RowError(sheet, row, column, message));
        }

        int size() { return list.size(); }

        boolean isEmpty() { return list.isEmpty(); }
    }

    private static final class Dept {
        final int row; final String code; final String name; final String description;
        final List<Job> jobs = new ArrayList<>();
        Dept(int row, String code, String name, String description) {
            this.row = row; this.code = code; this.name = name; this.description = description;
        }
    }

    private static final class Job {
        final int row; final String code; final String name;
        final List<Role> roles = new ArrayList<>();
        Job(int row, String code, String name) {
            this.row = row; this.code = code; this.name = name;
        }
    }

    private static final class Role {
        final int row; final String code; final String name; final String scope;
        final Map<String, Lvl> levelsByName = new LinkedHashMap<>();
        final Map<Integer, Lvl> levelsByRank = new LinkedHashMap<>();
        Role(int row, String code, String name, String scope) {
            this.row = row; this.code = code; this.name = name; this.scope = scope;
        }
    }

    private record Lvl(int row, String name, int rank) {
    }
}
