#!/usr/bin/env python3
"""Local-only account provisioning; credentials are kept in ignored local/ storage."""
import argparse
import base64
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / 'local/dev-accounts'
EMAILS = ['platform.admin@example.test', 'org.admin@example.test', 'ld.manager@example.test', 'expert@example.test', 'employee@example.test']
ROLES = ['Platform Administrator', 'Organization Administrator', 'L&D Manager', 'Domain Expert', 'Employee']


def settings():
    STATE.mkdir(parents=True, exist_ok=True)
    path = STATE / 'private.env'
    if not path.exists():
        values = {'DEV_ACCOUNTS_DB_URL': 'jdbc:postgresql://127.0.0.1:28132/adapt_learn_graph_dev_accounts',
                  'DEV_ACCOUNTS_DB_USER': 'adapt_learn_graph', 'DEV_ACCOUNTS_DB_PASSWORD': secrets.token_urlsafe(24),
                  'DEV_ACCOUNTS_NEO4J_PASSWORD': secrets.token_urlsafe(24),
                  'DEV_ACCOUNTS_ENCRYPTION_KEY': base64.b64encode(secrets.token_bytes(32)).decode(),
                  'DEV_ACCOUNTS_HMAC_KEY': base64.b64encode(secrets.token_bytes(32)).decode(), 'DEV_ACCOUNTS_SEED_ALLOWED': 'true'}
        values.update({f'DEV_ACCOUNT_PASSWORD_{i}': 'Dev!' + secrets.token_urlsafe(16) for i in range(5)})
        descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, 'w') as stream:
            stream.write('\n'.join(f'{key}={value}' for key, value in values.items()) + '\n')
    values = dict(line.split('=', 1) for line in path.read_text().splitlines() if line and not line.startswith('#'))
    if 'DEV_LEARNING_MINIO_USER' not in values:
        values['DEV_LEARNING_MINIO_USER'] = 'learning-dev'
        values['DEV_LEARNING_MINIO_PASSWORD'] = secrets.token_urlsafe(32)
        with path.open('a') as stream:
            stream.write('\nDEV_LEARNING_MINIO_USER=' + values['DEV_LEARNING_MINIO_USER'] + '\nDEV_LEARNING_MINIO_PASSWORD=' + values['DEV_LEARNING_MINIO_PASSWORD'] + '\n')
    return values


def prepare():
    settings()
    build = STATE / 'build'
    if build.exists():
        shutil.rmtree(build)
    shutil.copytree(ROOT / 'backend', build / 'backend', ignore=shutil.ignore_patterns('target', '.git', '.env', '.env.*'))
    shutil.copytree(ROOT / 'documents/dataset/import/content', build / 'documents/dataset/import/content')
    wrapper = build / 'backend' / ('mvnw.cmd' if os.name == 'nt' else 'mvnw')
    command = [str(wrapper)] if os.name == 'nt' else ['bash', str(wrapper)]
    subprocess.run(command + ['-f', str(build / 'backend/pom.xml'), 'package', '-DskipTests', '-q'], check=True)
    target = build / 'backend/target'
    jar = next(path for path in target.glob('*.jar') if not path.name.endswith('-sources.jar'))
    shutil.copy2(jar, STATE / 'app.jar')
    for name in ['classes', 'libs', 'seed']:
        shutil.rmtree(STATE / name, ignore_errors=True)
    with zipfile.ZipFile(jar) as archive:
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            prefix = 'BOOT-INF/classes/' if entry.filename.startswith('BOOT-INF/classes/') else 'BOOT-INF/lib/' if entry.filename.startswith('BOOT-INF/lib/') else None
            if prefix:
                directory = 'classes' if prefix.endswith('classes/') else 'libs'
                path = STATE / directory / entry.filename[len(prefix):]
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(archive.read(entry))
    destination = STATE / 'seed/com/adaptlearngraph/development'
    destination.mkdir(parents=True)
    shutil.copytree(target / 'test-classes/com/adaptlearngraph/development', destination, dirs_exist_ok=True)
    print('Local application and seed runtime prepared. No images built; private settings preserved.')


def seed():
    values = settings()
    java = str(Path(os.environ['JAVA_HOME']) / 'bin/java') if os.environ.get('JAVA_HOME') else shutil.which('java')
    if not java or not (STATE / 'seed').exists():
        raise SystemExit('Java and a prepared runtime are required. Run prepare first.')
    classpath = os.pathsep.join(str(STATE / part) for part in ['seed', 'classes', 'libs/*'])
    subprocess.run([java, '-cp', classpath, 'com.adaptlearngraph.development.DevAccountsSeed'], env={**os.environ, **values}, check=True)
    report = STATE / 'ACCOUNTS.md'
    descriptor = os.open(report, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write('# Local development accounts\n\nURL: http://localhost:8088/login\n\nPrivate test credentials; never commit or use outside local development.\n\n| Role | Email | Password |\n|---|---|---|\n')
        for i, (email, role) in enumerate(zip(EMAILS, ROLES)):
            stream.write(f'| {role} | {email} | `{values[f"DEV_ACCOUNT_PASSWORD_{i}"]}` |\n')
        stream.write('\nOrganization Administrator must enroll an authenticator on first sign-in; email verification and subscription are synthetic development fixtures. Platform Administrator uses password only. Other members use passwords without MFA. Keep recovery codes privately.\n')
    print('Private credential sheet:', report)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'seed'])
    {'prepare': prepare, 'seed': seed}[parser.parse_args().action]()
