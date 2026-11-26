"""Summarize repeated RQ2 standalone runs in one results/rq2/<run-id>/ directory.

Usage: python3 documents/research/tools/summarize_rq2_runs.py documents/research/results/rq2/<run-id> [--exclude FILE ...]
Writes summary.json next to the runs and prints a Markdown table. Only aggregates stored in each run are used;
the service exports P50/P95/mean per run and at most 30 raw timings, so the summary describes run-to-run spread.
"""
import argparse
import hashlib
import json
import statistics
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('run_dir', type=Path)
    ap.add_argument('--exclude', nargs='*', default=[], help='file names kept on disk but left out of the summary')
    args = ap.parse_args()
    runs = {}
    for f in sorted(args.run_dir.glob('rq2-*.json')):
        d = json.loads(f.read_text())
        runs[f.name] = d
    summary = {'runDirectory': str(args.run_dir), 'excluded': args.exclude, 'files': {}, 'byScale': {}}
    for name, d in runs.items():
        summary['files'][name] = {
            'sha256': hashlib.sha256((args.run_dir / name).read_bytes()).hexdigest(),
            'scale': d['scale'], 'nodes': d['catalogNodes'], 'relationships': d['catalogRelationships'],
            'neo4jVersion': d['neo4jVersion'], 'measured': d['totalRuns'], 'warmups': d['warmupRuns'],
            'p50Ms': d['p50LatencyMs'], 'p95Ms': d['p95LatencyMs'], 'meanMs': d['meanLatencyMs'],
            'minMs': d['minLatencyMs'], 'maxMs': d['maxLatencyMs'], 'executedAt': d['executedAt'],
        }
    for scale in ('1k', '5k', '10k'):
        rows = [v for k, v in summary['files'].items() if v['scale'] == scale and k not in args.exclude]
        if not rows:
            continue
        def spread(key):
            xs = [r[key] for r in rows]
            return {'median': round(statistics.median(xs), 2), 'min': min(xs), 'max': max(xs)}
        summary['byScale'][scale] = {
            'runs': len(rows), 'nodes': rows[0]['nodes'], 'relationships': rows[0]['relationships'],
            'p50Ms': spread('p50Ms'), 'p95Ms': spread('p95Ms'), 'meanMs': spread('meanMs'),
        }
    (args.run_dir / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print('| Nodes | Edges | Runs | P50 median [min–max] ms | P95 median [min–max] ms | Mean median [min–max] ms |')
    print('|---:|---:|---:|---:|---:|---:|')
    for s in summary['byScale'].values():
        fmt = lambda m: f"{m['median']:.2f} [{m['min']:.2f}–{m['max']:.2f}]"
        print(f"| {s['nodes']:,} | {s['relationships']:,} | {s['runs']} | {fmt(s['p50Ms'])} | {fmt(s['p95Ms'])} | {fmt(s['meanMs'])} |")


if __name__ == '__main__':
    main()
