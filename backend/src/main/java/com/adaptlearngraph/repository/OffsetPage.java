package com.adaptlearngraph.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** {@code OFFSET offset LIMIT limit} for repository queries paged by row offset instead of page number. */
record OffsetPage(long offset, int limit) implements Pageable {
    OffsetPage {
        if (offset < 0 || limit < 1) throw new IllegalArgumentException("Invalid offset page");
    }

    @Override public int getPageNumber() { return (int) (offset / limit); }
    @Override public int getPageSize() { return limit; }
    @Override public long getOffset() { return offset; }
    @Override public Sort getSort() { return Sort.unsorted(); }
    @Override public Pageable next() { return new OffsetPage(offset + limit, limit); }
    @Override public Pageable previousOrFirst() { return hasPrevious() ? new OffsetPage(Math.max(0, offset - limit), limit) : first(); }
    @Override public Pageable first() { return new OffsetPage(0, limit); }
    @Override public Pageable withPage(int pageNumber) { return new OffsetPage((long) pageNumber * limit, limit); }
    @Override public boolean hasPrevious() { return offset > 0; }
}
