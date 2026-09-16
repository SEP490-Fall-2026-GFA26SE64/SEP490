# Recommendation Computation Boundary

Reserved Python component, not an implemented algorithm or runnable package yet.

The Java worker will invoke a fixed Python module as a subprocess using versioned JSON on stdin/stdout. It supplies complete de-identified frozen inputs. Python must receive no database credentials, perform no operational writes and never approve/publish a pathway. Sanitize stderr and keep stdout exclusively for the response document.

Before implementing the package, approve ranking/model policies and freeze the request/response schemas in the shared contracts folder. Then initialize `src/adapt_learn_graph_recommendation` and `tests` with a Python packaging tool, lock NetworkX/NumPy/scikit-learn dependencies, and validate the same fixture set from Java and Python. Include deadline, output-limit, hash/version mismatch and subprocess-crash tests in Java.

The content-based baseline is required; collaborative filtering is not a replacement. No synthetic success response or placeholder ranking is supplied by this scaffold.