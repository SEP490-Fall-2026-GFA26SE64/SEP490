#!/usr/bin/env python3
"""Validate and add an XLSX catalog to Neo4j 5.26. Python standard library only."""
import argparse
import base64
from collections import Counter, defaultdict, deque
from datetime import datetime
import json
import math
import os
from pathlib import Path
import posixpath
import re
import sys
import subprocess
import time
from urllib import error, parse, request
import uuid
import xml.etree.ElementTree as ET
import zipfile

BASE = Path(__file__).resolve().parent
DEFAULT_FILE = BASE / "neo4j_dataset_schema_diagram_aligned.xlsx"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
COMMON = ["status", "createdAt", "updatedAt"]
NODES = {
    "Job Domains": ("JobDomain", ["id", "code", "name", "description"] + COMMON),
    "Target Roles": ("TargetRole", ["id", "code", "name", "familyCode", "track", "description"] + COMMON + ["organizationId", "seniority"]),
    "Macro Competencies": ("MacroCompetency", ["id", "code", "name", "description"] + COMMON),
    "MicroSkills": ("MicroSkill", ["id", "code", "name", "description"] + COMMON),
    "Learning Modules": ("LearningModule", ["id", "code", "title", "provider", "platform", "sourceUrl", "durationHours", "priceAmount", "currency"] + COMMON),
}
RELS = {
    "HAS_ROLE": ("Job Domains", "Target Roles", []),
    "REQUIRES_MACRO": ("Target Roles", "Macro Competencies", []),
    "HAS_SKILL": ("Macro Competencies", "MicroSkills", []),
    "REQUIRES_SKILL": ("Target Roles", "MicroSkills", ["targetMastery"]),
    "PREREQUISITE_OF": ("MicroSkills", "MicroSkills", ["minMastery"]),
    "TEACHES": ("Learning Modules", "MicroSkills", ["outcomeMastery", "coverage"]),
    "HAS_ENTRY_REQUIREMENT": ("Learning Modules", "MicroSkills", ["minMastery"]),
}
STATUS = {"DRAFT", "ACTIVE", "RETIRED"}
COVERAGE = {"INTRODUCTION_OR_REVIEW", "SUPPORTING", "CORE", "ADVANCED"}


class ValidationError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def valid_uuid(value):
    try:
        return isinstance(value, str) and str(uuid.UUID(value)) == value.lower()
    except (ValueError, TypeError, AttributeError):
        return False


def column_index(ref):
    letters = re.match(r"[A-Z]+", ref).group()
    index = 0
    for letter in letters:
        index = index * 26 + ord(letter) - 64
    return index - 1


def read_xlsx(path):
    """Read literal cells; reject formulas in import tables instead of trusting caches."""
    result = {}
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(si.itertext()) for si in root.findall("s:si", NS)]
        links = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {r.attrib["Id"]: r.attrib["Target"] for r in links}
        root = ET.fromstring(archive.read("xl/workbook.xml"))
        for sheet in root.findall("s:sheets/s:sheet", NS):
            name = sheet.attrib["name"]
            if name not in NODES and name not in RELS:
                continue
            rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = targets[rid]
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            xml = ET.fromstring(archive.read(member))
            rows = {}
            for row in xml.findall("s:sheetData/s:row", NS):
                number = int(row.attrib["r"])
                values = {}
                for cell in row.findall("s:c", NS):
                    ref = cell.attrib["r"]
                    require(number < 4 or cell.find("s:f", NS) is None,
                            f"{name}!{ref}: formulas are not supported in import tables")
                    kind = cell.attrib.get("t")
                    value = cell.findtext("s:v", default=None, namespaces=NS)
                    if kind == "inlineStr":
                        value = "".join(cell.find("s:is", NS).itertext())
                    elif kind == "s":
                        value = shared[int(value)]
                    elif kind == "b":
                        value = value == "1"
                    elif kind == "e":
                        raise ValidationError(f"{name}!{ref}: Excel error {value}")
                    elif value is not None and kind not in ("str", "d"):
                        value = float(value)
                    if value is not None and value != "":
                        values[column_index(ref)] = value
                rows[number] = values
            header_cells = rows.get(4, {})
            require(bool(header_cells), f"{name}: header must be on row 4")
            width = max(header_cells) + 1
            headers = [header_cells.get(i) for i in range(width)]
            require(all(text(x) for x in headers) and len(set(headers)) == width,
                    f"{name}: blank or duplicate headers")
            records = []
            for number, values in sorted(rows.items()):
                if number <= 4 or not values:
                    continue
                require(max(values) < width, f"{name} row {number}: data beyond table headers")
                record = {headers[i]: values.get(i) for i in range(width)}
                if name in RELS:
                    require(headers[0].startswith("sourceCode (") and headers[2].startswith("targetCode ("),
                            f"{name}: expected sourceCode/targetCode endpoint headers")
                    record["sourceCode"] = record.pop(headers[0])
                    record["targetCode"] = record.pop(headers[2])
                record["_row"] = number
                records.append(record)
            if name in NODES:
                expected = set(NODES[name][1])
                optional = {"responsibilities"} if name == "Target Roles" else set()
                actual = set(headers)
            else:
                expected = {"sourceCode", "targetCode", "relationshipType", *COMMON, *RELS[name][2]}
                optional = set()
                actual = {"sourceCode", "targetCode", *headers[1:2], *headers[3:]}
            require(expected <= actual and actual <= expected | optional,
                    f"{name}: missing columns {sorted(expected - actual)}; unexpected {sorted(actual - expected - optional)}")
            result[name] = records
    require(set(result) == set(NODES) | set(RELS), "Workbook must contain all five node and seven relationship sheets")
    return result


def prepare(data, organization_id=None):
    if organization_id:
        require(valid_uuid(organization_id), "--organization-id must be a canonical UUID")
        organization_id = str(uuid.UUID(organization_id))
    for row in data["Target Roles"]:
        current = row.get("organizationId")
        if current is None:
            row["organizationId"] = organization_id
        elif organization_id:
            require(current == organization_id, f"Target Roles row {row['_row']}: organization override conflicts with workbook")
        if "responsibilities" in row:
            if row["responsibilities"] is None:
                row.pop("responsibilities")
            elif isinstance(row["responsibilities"], str):
                try:
                    row["responsibilities"] = json.loads(row["responsibilities"])
                except json.JSONDecodeError as exc:
                    raise ValidationError("responsibilities must be a JSON string array") from exc
    validate_graph(data)
    return data


def validate_graph(data):
    indexes = {}
    for sheet, rows in data.items():
        codes = set()
        ids = set()
        pairs = set()
        for row in rows:
            where = f"{sheet} row {row.get('_row', '?')}"
            require(row.get("status") in STATUS, f"{where}: invalid status")
            times = []
            for field in ("createdAt", "updatedAt"):
                try:
                    dt = datetime.fromisoformat(row[field].replace("Z", "+00:00"))
                    require(dt.tzinfo is not None, f"{where}: {field} requires timezone")
                    times.append(dt)
                except (KeyError, ValueError, TypeError, AttributeError) as exc:
                    raise ValidationError(f"{where}: invalid ISO-8601 {field}") from exc
            require(times[1] >= times[0], f"{where}: updatedAt precedes createdAt")
            if sheet in NODES:
                for field in ["id", "code", "title" if sheet == "Learning Modules" else "name"]:
                    require(text(row.get(field)), f"{where}: {field} is required")
                require(row["code"] == row["code"].strip() and row["id"] == row["id"].strip(),
                        f"{where}: id/code must not have surrounding spaces")
                require(row["code"] not in codes and row["id"] not in ids, f"{where}: duplicate id/code")
                codes.add(row["code"])
                ids.add(row["id"])
            else:
                require(row.get("relationshipType") == sheet, f"{where}: wrong relationshipType")
                pair = (row.get("sourceCode"), row.get("targetCode"))
                require(all(text(x) for x in pair), f"{where}: missing relationship endpoint")
                require(pair not in pairs, f"{where}: duplicate edge {pair}")
                pairs.add(pair)
            for field in ("targetMastery", "minMastery", "outcomeMastery"):
                if field in row:
                    value = row[field]
                    require(type(value) in (float, int) and math.isfinite(value) and 0 <= value <= 1,
                            f"{where}: {field} must be a number in [0,1]")
                    row[field] = float(value)
            if sheet == "TEACHES":
                require(row.get("coverage") in COVERAGE, f"{where}: invalid coverage")
            if sheet == "Target Roles":
                require(valid_uuid(row.get("organizationId")),
                        f"{where}: organizationId is missing/invalid; fill the workbook or pass --organization-id")
                require(text(row.get("familyCode")), f"{where}: missing familyCode")
                grades = {"PROFESSIONAL": {f"P{i}" for i in range(1, 6)}, "MANAGEMENT": {"M3", "M4"}}
                require(row.get("seniority") in grades.get(row.get("track"), set()), f"{where}: seniority does not match track")
                if "responsibilities" in row:
                    require(isinstance(row["responsibilities"], list) and all(text(x) for x in row["responsibilities"]),
                            f"{where}: responsibilities must be a nonempty-text string array")
            if sheet == "Learning Modules":
                for field in ("provider", "platform", "sourceUrl"):
                    require(text(row.get(field)), f"{where}: missing {field}")
                url = parse.urlsplit(row["sourceUrl"])
                require(url.scheme in {"http", "https"} and bool(url.hostname) and not any(c.isspace() for c in row["sourceUrl"]),
                        f"{where}: invalid HTTP(S) sourceUrl")
                for field in ("durationHours", "priceAmount"):
                    value = row.get(field)
                    if value is not None:
                        require(type(value) in (int, float) and math.isfinite(value) and
                                (value > 0 if field == "durationHours" else value >= 0), f"{where}: invalid {field}")
                if row.get("priceAmount") is not None:
                    require(text(row.get("currency")), f"{where}: currency is required when price is present")
        if sheet in NODES:
            indexes[sheet] = {r["code"]: r for r in rows}
    for kind, (source, target, _) in RELS.items():
        for row in data[kind]:
            require(row["sourceCode"] in indexes[source] and row["targetCode"] in indexes[target],
                    f"{kind} row {row.get('_row', '?')}: missing endpoint")
    for kind, nodes, endpoint in [("HAS_ROLE", "Target Roles", "targetCode"), ("HAS_SKILL", "MicroSkills", "targetCode")]:
        counts = Counter(r[endpoint] for r in data[kind] if r["status"] == "ACTIVE")
        for row in data[nodes]:
            require(counts[row["code"]] == 1, f"{nodes} {row['code']}: expected exactly one active {kind}")
    for nodes, kind in [("Target Roles", "REQUIRES_SKILL"), ("Learning Modules", "TEACHES")]:
        target_sheet = RELS[kind][1]
        sources = {r["sourceCode"] for r in data[kind] if r["status"] == "ACTIVE" and indexes[target_sheet][r["targetCode"]]["status"] == "ACTIVE"}
        for row in data[nodes]:
            require(row["status"] != "ACTIVE" or row["code"] in sources, f"{nodes} {row['code']}: no active {kind} to an active skill")
    graph = defaultdict(set)
    indegree = {code: 0 for code in indexes["MicroSkills"]}
    for row in data["PREREQUISITE_OF"]:
        a, b = row["sourceCode"], row["targetCode"]
        require(a != b, f"PREREQUISITE_OF: self-loop {a}")
        graph[a].add(b)
    for neighbors in graph.values():
        for code in neighbors:
            indegree[code] += 1
    ready = deque(k for k, count in indegree.items() if count == 0)
    visited = 0
    while ready:
        current = ready.popleft()
        visited += 1
        for child in graph[current]:
            indegree[child] -= 1
            if indegree[child] == 0:
                ready.append(child)
    require(visited == len(indegree), "PREREQUISITE_OF: cycle detected (including non-ACTIVE edges)")


class Neo4jHTTP:
    def __init__(self, base_url, database, user, password):
        parsed = parse.urlsplit(base_url)
        require(parsed.scheme in {"http", "https"} and parsed.hostname and not parsed.username,
                "--url must be an HTTP(S) URL without credentials")
        require(parsed.scheme == "https" or parsed.hostname in {"localhost", "127.0.0.1", "::1"},
                "Use HTTPS for a non-loopback Neo4j server")
        self.base = base_url.rstrip("/") + "/db/" + parse.quote(database, safe="") + "/tx"
        self.auth = "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()
        self.tx = None

    def send(self, url, statements=None, method="POST"):
        payload = None if method == "DELETE" else json.dumps({"statements": statements or []}).encode()
        req = request.Request(url, data=payload, method=method, headers={"Authorization": self.auth, "Content-Type": "application/json", "Accept": "application/json"})
        try:
            with request.urlopen(req, timeout=120) as response:
                result = json.load(response)
        except error.HTTPError as exc:
            raise ValidationError(f"Neo4j HTTP {exc.code}; verify URL, database and credentials") from exc
        except (error.URLError, TimeoutError) as exc:
            raise ValidationError("Neo4j connection failed. A lost commit response may have committed; check the database before rerunning.") from exc
        if result.get("errors"):
            first = result["errors"][0]
            raise ValidationError(f"Neo4j {first.get('code')}: {first.get('message')}")
        return result

    def begin(self):
        result = self.send(self.base)
        # Use only the returned numeric transaction id, never a server-provided host.
        txid = parse.urlsplit(result["commit"]).path.split("/")[-2]
        require(txid.isdigit(), "Unexpected Neo4j transaction identifier")
        self.tx = self.base + "/" + txid

    def query(self, statement, parameters=None):
        result = self.send(self.tx, [{"statement": statement, "parameters": parameters or {}}])
        table = result["results"][0]
        return [dict(zip(table["columns"], item["row"])) for item in table["data"]]

    def commit(self):
        self.send(self.tx + "/commit")
        self.tx = None

    def rollback(self):
        if self.tx:
            try:
                self.send(self.tx, method="DELETE")
            finally:
                self.tx = None


def snapshot(client):
    data = {name: [] for name in [*NODES, *RELS]}
    for sheet, (label, _) in NODES.items():
        data[sheet] = [r["props"] for r in client.query(f"MATCH (n:{label}) RETURN properties(n) AS props")]
    for kind, (source, target, _) in RELS.items():
        a, b = NODES[source][0], NODES[target][0]
        for r in client.query(f"MATCH (a:{a})-[r:{kind}]->(b:{b}) RETURN a.code AS sourceCode, b.code AS targetCode, properties(r) AS props"):
            data[kind].append({**r["props"], "sourceCode": r["sourceCode"], "targetCode": r["targetCode"], "relationshipType": kind})
    return data


def merge_preview(existing, incoming):
    merged = {}
    reused = Counter()
    for sheet in [*NODES, *RELS]:
        if sheet in NODES:
            require(all(text(r.get('code')) and text(r.get('id')) for r in existing[sheet]),
                    f'Database {sheet} contains legacy/incomplete nodes missing id or code; existing data was not changed')
        key = (lambda r: r["code"]) if sheet in NODES else (lambda r: (r["sourceCode"], r["targetCode"]))
        lookup = {key(r): r for r in existing[sheet]}
        require(len(lookup) == len(existing[sheet]), f"Database has duplicate {sheet} entries")
        by_id = {r["id"]: r["code"] for r in existing[sheet]} if sheet in NODES else {}
        for row in incoming[sheet]:
            ident = key(row)
            if sheet in NODES:
                require(row["id"] not in by_id or by_id[row["id"]] == row["code"], f"{sheet}: incoming ID belongs to a different database code")
            if ident in lookup:
                reused[sheet] += 1
                old = lookup[ident]
                if sheet == "Target Roles":
                    require(old.get("organizationId") == row["organizationId"], f"TargetRole {row['code']}: code already belongs to a different organization")
                if sheet in RELS:
                    for field in ["status", *RELS[sheet][2]]:
                        require(old.get(field) == row.get(field), f"{sheet} {ident}: existing {field} differs; add-only import cannot overwrite it")
            else:
                lookup[ident] = row
        merged[sheet] = list(lookup.values())
    validate_graph(merged)
    return dict(reused)


def check_constraints(client):
    rows = client.query("SHOW CONSTRAINTS YIELD type, labelsOrTypes, properties RETURN type, labelsOrTypes, properties")
    unique = {(tuple(r["labelsOrTypes"]), tuple(r["properties"])) for r in rows if r["type"] == "UNIQUENESS"}
    missing = [f"{label}.{prop}" for label, _ in NODES.values() for prop in ("id", "code") if ((label,), (prop,)) not in unique]
    require(not missing, "Missing uniqueness constraints: " + ", ".join(missing) + "; run the project's migrate profile first")


def compose_connection():
    """Resolve Compose interpolation (.env included), without logging secrets."""
    try:
        result = subprocess.run(
            ["docker", "compose", "-f", "compose.dev.yml", "config", "--format", "json"],
            cwd=BASE.parent.parent, capture_output=True, text=True, timeout=30)
        require(result.returncode == 0, "Cannot resolve Compose configuration; provide NEO4J_HTTP_URL and NEO4J_PASSWORD explicitly")
        service = json.loads(result.stdout)["services"]["neo4j"]
        auth = service["environment"]["NEO4J_AUTH"]
        user, password = auth.split("/", 1)
        port = next(p["published"] for p in service["ports"] if int(p["target"]) == 7474)
        return f"http://127.0.0.1:{port}", user, password
    except (OSError, subprocess.TimeoutExpired, ValueError, KeyError, StopIteration) as exc:
        raise ValidationError("Cannot resolve Docker Compose; provide NEO4J_HTTP_URL and NEO4J_PASSWORD explicitly") from exc


def wait_ready(client, timeout):
    deadline = time.monotonic() + timeout
    while True:
        try:
            client.begin()
            client.query("RETURN 1 AS ready")
            client.rollback()
            return
        except ValidationError as exc:
            if not ("connection failed" in str(exc) or "HTTP 503" in str(exc)):
                raise
            if time.monotonic() >= deadline:
                raise ValidationError("Neo4j is not ready; start Docker Compose and retry") from exc
            if client.tx:
                try:
                    client.rollback()
                except Exception:
                    client.tx = None
            time.sleep(2)


def ensure_constraints(client):
    path = BASE.parent.parent / "backend/src/main/resources/db/neo4j/V1__catalog_constraints.cypher"
    client.begin()
    for statement in path.read_text().split(";"):
        if statement.strip():
            client.query(statement.strip())
    client.commit()


def write_graph(client, data):
    for sheet, (label, _) in NODES.items():
        rows = [{k: v for k, v in r.items() if not k.startswith("_") and v is not None} for r in data[sheet]]
        query = f"""UNWIND $rows AS row MERGE (n:{label} {{code: row.code}})
        ON CREATE SET n += row, n.createdAt = datetime(row.createdAt), n.updatedAt = datetime(row.updatedAt)
        RETURN count(n) AS matched"""
        require(client.query(query, {"rows": rows})[0]["matched"] == len(rows), f"{sheet}: node count mismatch")
    for kind, (source, target, _) in RELS.items():
        a, b = NODES[source][0], NODES[target][0]
        rows = [{"sourceCode": r["sourceCode"], "targetCode": r["targetCode"], "props": {k: v for k, v in r.items() if k not in {"sourceCode", "targetCode", "relationshipType", "_row"} and v is not None}} for r in data[kind]]
        query = f"""UNWIND $rows AS row MATCH (a:{a} {{code: row.sourceCode}}), (b:{b} {{code: row.targetCode}})
        MERGE (a)-[r:{kind}]->(b) ON CREATE SET r += row.props,
        r.createdAt = datetime(row.props.createdAt), r.updatedAt = datetime(row.props.updatedAt)
        RETURN count(r) AS matched"""
        require(client.query(query, {"rows": rows})[0]["matched"] == len(rows), f"{kind}: relationship count mismatch")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE)
    parser.add_argument("--organization-id", default=os.environ.get("DATASET_ORGANIZATION_ID"))
    parser.add_argument("--url", default=os.environ.get("NEO4J_HTTP_URL"))
    parser.add_argument("--database", default=os.environ.get("NEO4J_DATABASE", "neo4j"))
    parser.add_argument("--user", default=os.environ.get("NEO4J_USER"))
    parser.add_argument("--wait-seconds", type=int, default=180, help="Wait for Neo4j startup (default: 180 seconds)")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Validate workbook only, no database connection")
    mode.add_argument("--check-database", action="store_true", help="Check constraints and combined graph, without writes")
    mode.add_argument("--apply", action="store_true", help="Commit an add-only import in one transaction")
    args = parser.parse_args(argv)
    args.apply = not (args.dry_run or args.check_database)
    client = None
    try:
        data = prepare(read_xlsx(args.file), args.organization_id)
        print(json.dumps({"file": str(args.file), "records": {k: len(v) for k, v in data.items()}, "mode": "apply" if args.apply else "check-database" if args.check_database else "dry-run"}, indent=2))
        if not (args.apply or args.check_database):
            print("Workbook validation passed; database was not contacted.")
            return 0
        password = os.environ.get("NEO4J_PASSWORD")
        if not password or not args.url:
            compose_url, compose_user, compose_password = compose_connection()
            args.url = args.url or compose_url
            args.user = args.user or compose_user
            password = password or compose_password
        client = Neo4jHTTP(args.url, args.database, args.user or "neo4j", password)
        print("Waiting for Neo4j readiness...")
        require(args.wait_seconds >= 0, "--wait-seconds must be nonnegative")
        wait_ready(client, args.wait_seconds)
        if args.apply:
            ensure_constraints(client)
        client.begin()
        check_constraints(client)
        reused = merge_preview(snapshot(client), data)
        print("Existing records reused without overwriting: " + json.dumps(reused))
        if args.check_database:
            client.rollback()
            print("Database preflight passed; no data written.")
            return 0
        write_graph(client, data)
        # Validate the actual transactional state, not only the preflight projection.
        validate_graph(snapshot(client))
        client.commit()
        print("Import committed. Existing IDs/properties were preserved; no nodes or relationships deleted.")
        return 0
    except (ValidationError, OSError, zipfile.BadZipFile, ET.ParseError, KeyError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        return 1
    finally:
        if client and client.tx:
            try:
                client.rollback()
            except Exception:
                print("Rollback could not be confirmed; check the database before rerunning.", file=sys.stderr)


if __name__ == "__main__":
    sys.exit(main())
