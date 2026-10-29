#!/usr/bin/env python3
"""Read-only role/login checks plus sign-in/out mutations on the isolated dev stack."""
import http.cookiejar
import json
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from accounts import EMAILS, settings

BASE = 'http://127.0.0.1:28180'
ROLES = ['PLATFORM_ADMINISTRATOR', 'ORGANIZATION_ADMINISTRATOR', 'LD_MANAGER', 'DOMAIN_EXPERT', 'EMPLOYEE']
values = settings()
for index, role in enumerate(ROLES):
    client = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(path, body=None):
        headers = {}
        if body is not None:
            _, csrf = call('/api/v1/workspace-auth/csrf')
            headers = {csrf['headerName']: csrf['token'], 'Content-Type': 'application/json'}
        request = Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers=headers)
        try:
            with client.open(request, timeout=60) as response:
                content = response.read()
                return response.status, json.loads(content) if content else None
        except HTTPError as error:
            return error.code, None

    status, identity = call('/api/v1/workspace-auth/sign-in', {'email': EMAILS[index], 'password': values[f'DEV_ACCOUNT_PASSWORD_{index}']})
    assert status == 200 and identity['roles'] == ([] if index == 1 else [role]), (role, status)
    expected = 'SETUP_MFA' if index == 1 else 'COMPLETE'
    assert identity['stage'] == expected, (role, identity['stage'])
    if index == 0:
        assert identity['organizationId'] is None
        assert call('/api/v1/platform/workspaces')[0] == 200
        assert call('/api/v1/module-management/session')[0] == 403
    elif index > 1:
        assert call('/api/v1/subscription/access')[0] == 200
        assert call('/api/v1/platform/workspaces')[0] == 403
        assert call('/api/v1/module-management/session')[0] == 200
    else:
        assert call('/api/v1/module-management/session')[0] in (401, 403)
    assert call('/api/v1/workspace-auth/sign-out', {})[0] == 204
    assert call('/api/v1/workspace-auth/current')[0] == 401
    print(role + ': expected login stage, authorization and logout verified')
print('5/5 real credential identities verified; Organization Administrator MFA enrollment remains required.')
