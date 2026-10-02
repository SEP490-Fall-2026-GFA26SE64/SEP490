# REQ-001-F01 manual browser system check

Use this checklist only against the local development Compose stack. It verifies the browser-observed part of F01-S01; it does not validate production Identity integration.

## 1. Start and verify the stack

From `project/SEP490`:

```powershell
docker compose -f compose.dev.yml up --build -d
docker compose -f compose.dev.yml ps
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
Invoke-RestMethod http://127.0.0.1:8088/api/v1/employee/target-roles
```

Expected:

- `postgres` and `neo4j` are healthy, `migrate` exited with code `0`, and `api` and `web` are running.
- System status identifies `adapt-learn-graph`.
- The target-role API returns the development `Java Backend Developer P3` role.

If a custom `NEO4J_PASSWORD` is configured, replace `local-only-neo4j` in the commands below.

## 2. Check the normal browser flow

Open <http://127.0.0.1:8088/employee/target-roles> and use the **Explore Target Roles** section.

1. Confirm the page shows `Java Backend Developer P3`, seniority `P3`, track `PROFESSIONAL`, and two required micro-skills.
2. Search for `java`; the role remains visible.
3. Search for a value that does not match, such as `python`; confirm **No matching roles** and exactly one **Clear filters** action.
4. Select seniority `M3`; confirm **No matching roles**. Use **Clear filters**.
5. Select seniority `P3`; confirm the Java role is visible.
6. Choose **View details**. Confirm description, both responsibilities, `Java Core` at `60%`, and `Spring Boot` at `70%`.
7. Choose **Back to roles**. Confirm browsing did not select or change an active target role and the new browse cards contain no selection action.

Record: `PASS / FAIL`, browser, date, and any screenshot or observed mismatch.

## 3. Check a role becoming unavailable

1. Open **View details** for the Java role and leave the dialog open.
2. In another PowerShell window, run:

```powershell
docker compose -f compose.dev.yml exec neo4j cypher-shell -u neo4j -p local-only-neo4j "MATCH (role:TargetRole {code: 'JAVA_BACKEND_P3'}) SET role.status = 'RETIRED' RETURN role.code, role.status"
```

3. Return focus to the browser. TanStack Query should reread the current detail. If it does not refetch immediately, switch to another browser tab and back once.
4. Confirm the dialog changes to **This role is no longer available** and provides **Back to roles** without exposing whether the cause is tenant scope, deletion, or retirement.
5. Choose **Back to roles**, then refresh. Confirm **No target roles available** and the Organization Administrator guidance.
6. Restore the fixture before continuing:

```powershell
docker compose -f compose.dev.yml exec neo4j cypher-shell -u neo4j -p local-only-neo4j "MATCH (role:TargetRole {code: 'JAVA_BACKEND_P3'}) SET role.status = 'ACTIVE' RETURN role.code, role.status"
```

7. Refresh the page and confirm the role returns.

Record: `PASS / FAIL`, date, and whether browser focus caused the detail refetch.

## 4. Check dependency failure and recovery

1. Stop Neo4j:

```powershell
docker compose -f compose.dev.yml stop neo4j
```

2. Refresh the target-role page or change a filter to issue a new request.
3. Confirm **Target-role catalog unavailable** and a **Retry** action appear; it must not look like an empty catalog.
4. Restart Neo4j and wait until it is healthy:

```powershell
docker compose -f compose.dev.yml start neo4j
docker compose -f compose.dev.yml ps
```

5. Choose **Retry**. Confirm the role list recovers without restarting the web or API container.

Record: `PASS / FAIL`, date, and recovery time if notable.

## 5. Finish and report

Do not remove volumes unless a fresh fixture is intentionally required. To stop the stack while preserving local data:

```powershell
docker compose -f compose.dev.yml down
```

Report these three results:

```text
Normal browse/search/filter/detail: PASS | FAIL
Unavailable and empty states: PASS | FAIL
Neo4j failure and Retry recovery: PASS | FAIL
Browser/date/notes:
```

F01-S01 may be changed from `PARTIAL` to `PASS` only after all three groups pass and the result is recorded in the function evidence file.
