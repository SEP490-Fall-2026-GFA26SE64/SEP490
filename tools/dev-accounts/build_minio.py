#!/usr/bin/env python3
"""Optional local MinIO fallback; official source, temporary checksum-verified Go, no image build."""
from pathlib import Path
import hashlib
import json
import os
import platform
import shutil
import stat
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / 'local/dev-accounts/minio-build'
TAG = 'RELEASE.2025-04-22T22-12-26Z'
GO = 'go1.24.9'


def download(url, target):
    subprocess.run(['curl', '-fL', '--max-time', '180', '-o', str(target), url], check=True)


def main():
    STATE.mkdir(parents=True, exist_ok=True)
    binary = STATE / 'minio'
    receipt = STATE / 'BUILD.json'
    if binary.is_file() and receipt.is_file():
        prior = json.loads(receipt.read_text())
        if prior.get('binarySha256') == hashlib.sha256(binary.read_bytes()).hexdigest():
            print('Local MinIO binary matches its build receipt; no downloads or changes.')
            return
        raise SystemExit('Existing binary differs from its receipt; refusing to overwrite.')
    if binary.exists():
        raise SystemExit('Existing MinIO binary has no matching build receipt; refusing to overwrite.')
    host = {'Darwin': 'darwin', 'Linux': 'linux'}.get(platform.system())
    arch = {'arm64': 'arm64', 'aarch64': 'arm64', 'x86_64': 'amd64', 'AMD64': 'amd64'}.get(platform.machine())
    if not host or not arch:
        raise SystemExit('Use the official MinIO image or build the Linux binary on a supported host.')
    work = STATE / 'temporary-build'
    work.mkdir(exist_ok=False)
    try:
        releases = work / 'go-releases.json'
        download('https://go.dev/dl/?mode=json&include=all', releases)
        filename = f'{GO}.{host}-{arch}.tar.gz'
        expected = next(item['sha256'] for release in json.loads(releases.read_text()) if release['version'] == GO
                        for item in release['files'] if item['filename'] == filename)
        toolchain = work / 'go.tar.gz'
        download('https://go.dev/dl/' + filename, toolchain)
        if hashlib.sha256(toolchain.read_bytes()).hexdigest() != expected:
            raise SystemExit('Go checksum mismatch; compilation refused.')
        source = work / 'minio.tar.gz'
        download('https://codeload.github.com/minio/minio/tar.gz/refs/tags/' + TAG, source)
        for archive in [toolchain, source]:
            with tarfile.open(archive) as content:
                content.extractall(work, filter='data')
        source_root = work / ('minio-' + TAG)
        env = {**os.environ, 'CGO_ENABLED': '0', 'GOOS': 'linux', 'GOARCH': arch,
               'GOMAXPROCS': '2', 'GOMEMLIMIT': '256MiB', 'GOGC': '50',
               'GOCACHE': str(work / 'cache'), 'GOPATH': str(work / 'modules')}
        subprocess.run([str(work / 'go/bin/go'), '-C', str(source_root), 'build', '-p', '1', '-o', str(binary), '.'], env=env, check=True)
        shutil.copy2(source_root / 'LICENSE', STATE / 'LICENSE')
        receipt.write_text(json.dumps({'source': 'https://github.com/minio/minio', 'tag': TAG,
                           'go': GO, 'goChecksum': expected, 'platform': 'linux/' + arch,
                           'binarySha256': hashlib.sha256(binary.read_bytes()).hexdigest()}, indent=2) + '\n')
        print('Local source-built MinIO prepared. Use compose.learning-source-dev.yml with the dev compose file.')
    finally:
        # Only this invocation's compiler/source/download cache; never storage objects or data volumes.
        if work.exists():
            for directory, _, _ in os.walk(work):
                os.chmod(directory, os.stat(directory).st_mode | stat.S_IWUSR)
            shutil.rmtree(work)


if __name__ == '__main__':
    main()
