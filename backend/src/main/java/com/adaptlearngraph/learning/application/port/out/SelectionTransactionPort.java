package com.adaptlearngraph.learning.application.port.out;

import java.util.Objects;
import java.util.function.Supplier;

/** Runs selection work in the transaction supplied by the infrastructure adapter. */
public interface SelectionTransactionPort {
    <T> T required(Supplier<T> work);

    default void required(Runnable work) {
        Objects.requireNonNull(work, "work must not be null");
        required(() -> {
            work.run();
            return null;
        });
    }
}
