package com.adaptlearngraph.exception;

public class PrerequisiteCycleException extends RuntimeException {
    public PrerequisiteCycleException(String message) {
        super(message);
    }
}
