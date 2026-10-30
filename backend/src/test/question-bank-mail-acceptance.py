"""Real, isolated SMTP failure/recovery check; never sends to an external server.

Requires run-question-bank-api.sh and the dedicated Compose services. Temporarily
pauses only test Mailpit; finally always resumes it. No volumes/data are deleted.
"""
import http.cookiejar
import json
from pathlib import Path
import subprocess
import time
import urllib.request
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ["docker", "compose", "-f", str(ROOT / "compose.question-bank-test.yml")]
BASE = "http://127.0.0.1:28480"
MAIL = "http://127.0.0.1:28425"
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def read(url, data=None, headers=None):
    request = urllib.request.Request(url, data=None if data is None else json.dumps(data).encode(), headers=headers or {})
    with client.open(request, timeout=30) as response:
        assert response.status == 200
        return json.load(response)


def post(path, data):
    csrf = read(BASE + "/api/v1/workspace-auth/csrf")
    return read(BASE + path, data, {"Content-Type": "application/json", csrf["headerName"]: csrf["token"]})


def sql(statement):
    output = subprocess.check_output(COMPOSE + ["exec", "-T", "postgres", "psql", "-U", "question_bank_test", "-d", "question_bank_test", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], text=True)
    return output.strip()


def wait_for(check, seconds, phase):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        value = check()
        if value:
            print(phase + ": passed", flush=True)
            return value
        time.sleep(1)
    raise AssertionError(phase + ": timed out")


assert sql("SELECT current_database()") == "question_bank_test"
post("/api/v1/workspace-auth/sign-in", {"email": "experta@question-bank.test", "password": "question-bank-test-password"})
code = "SMTP-" + uuid4().hex[:12].upper()
choices = ["Protected choice " + str(i) + " for " + code for i in range(4)]
bank = post("/api/v1/question-bank/questions", {"code": code, "content": {
    "prompt": "Mail retry acceptance " + code, "options": choices,
    "correctAnswer": 0, "skillId": "QB-TEST-SQL", "skillName": None,
    "difficulty": "EASY", "explanation": "Protected explanation for " + code,
}})
question = next(q for q in bank["questions"] if q["code"] == code)
paused = False
try:
    subprocess.run(COMPOSE + ["pause", "mailpit"], check=True, stdout=subprocess.DEVNULL)
    paused = True
    bank = post("/api/v1/question-bank/commands", {"id": question["id"], "expectedRevision": question["revision"], "action": "SUBMIT"})
    assert next(q for q in bank["questions"] if q["id"] == question["id"])["versions"][-1]["state"] == "SUBMITTED"
    print("Submission committed while SMTP unavailable: passed", flush=True)

    def job():
        value = sql("SELECT json_build_object('status',status,'attempts',attempts) FROM platform.question_bank_mail WHERE title='Question awaiting review' AND body='" + code + "' ORDER BY created_at DESC LIMIT 1")
        return json.loads(value) if value else None

    wait_for(lambda: (j if (j := job()) and j["status"] == "RETRY" else None), 60, "Durable retry recorded")
finally:
    if paused:
        subprocess.run(COMPOSE + ["unpause", "mailpit"], check=True, stdout=subprocess.DEVNULL)

sent = wait_for(lambda: (j if (j := job()) and j["status"] == "SENT" else None), 90, "Retry delivered after SMTP recovery")
assert sent["attempts"] >= 2


def captured():
    for message in read(MAIL + "/api/v1/messages").get("messages", []):
        if message.get("Subject") != "Question awaiting review":
            continue
        detail = read(MAIL + "/api/v1/message/" + message["ID"])
        body = (detail.get("Text") or "") + (detail.get("HTML") or "")
        if code not in body:
            continue
        assert {p["Address"] for p in detail["To"]} == {"lda@question-bank.test"}
        assert all(choice not in body for choice in choices)
        assert "Protected explanation for " + code not in body
        return True
    return False


wait_for(captured, 15, "Same-organization recipient and no protected answer content")
print("Real Mailpit failure/recovery acceptance passed; no external email sent.", flush=True)
