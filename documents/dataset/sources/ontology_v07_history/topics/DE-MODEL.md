# Modelling data before optimizing it

Content version 1.0. Local authored introduction awaiting expert review.

## Explanation

Start with the meaning of one stored record. Identify the key that distinguishes records, the relationships between them and the constraints that preserve meaning. A physical table is one implementation of that model. Before measuring a query optimization, establish a result set that must remain unchanged. Metadata should let another engineer interpret each field and trace affected consumers.

## Worked example

Consider Order(order_id, customer_id) and OrderLine(order_id, product_id, quantity). Two lines for different products belong to one order. Counting joined rows counts lines, not orders. To report order counts, identify distinct order IDs or aggregate at the order grain. A faster query that returns the number of lines instead of orders is incorrect.

This is an illustrative teaching scenario, not a measured learner result.

## Check your understanding

Why can a join change the number of rows without creating new orders?

Answer: A join repeats an order for each matching line; report grain must be explicit.

## Official learning resources

- [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html)

These links supplement the local lesson. They do not imply endorsement of this course. Resource selection reviewed 12 October 2026.
