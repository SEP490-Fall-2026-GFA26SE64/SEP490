package com.adaptlearngraph.evaluation.application;
public class ResearchException extends RuntimeException {
    private final int status;
    public ResearchException(int status, String message) { super(message); this.status=status; }
    public int status() { return status; }
}
