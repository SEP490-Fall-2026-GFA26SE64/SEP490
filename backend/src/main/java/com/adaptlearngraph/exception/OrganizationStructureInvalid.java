package com.adaptlearngraph.exception;

import java.util.List;

/** An imported organization structure file was rejected as a whole; each error points to a source row and column. */
public final class OrganizationStructureInvalid extends RuntimeException {
    private final List<RowError> errors;

    public OrganizationStructureInvalid(List<RowError> errors) {
        super("The organization structure file contains errors.");
        this.errors = List.copyOf(errors);
    }

    public List<RowError> errors() {
        return errors;
    }

    /** {@code sheet} names the workbook tab (null for the whole file); {@code row} is its row number (0 = whole sheet/file). */
    public record RowError(String sheet, int row, String column, String message) {
    }
}
