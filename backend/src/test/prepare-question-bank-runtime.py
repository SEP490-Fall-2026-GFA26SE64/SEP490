"""Create an explicitly isolated test artifact; the distributable application stays unchanged.
Run Maven package/test-compile first. This copies only the opt-in fixture runtime,
not JUnit/Testcontainers or public fixture endpoints, into a separate generated jar.
"""
from pathlib import Path
from shutil import copy2
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[3]
target = root / 'backend' / 'target'
original = target / 'adapt-learn-graph.jar'
output = target / 'question-bank-test.jar'
fixture = Path('com/adaptlearngraph/assessment/bank')
classes = list((target / 'test-classes' / fixture).glob('QuestionBankTestRuntime*.class'))
if not original.is_file() or not classes:
    raise SystemExit('Run Maven package with test compilation before preparing the isolated runtime.')
with ZipFile(original) as product:
    if any('QuestionBankTestRuntime' in name for name in product.namelist()):
        raise SystemExit('Refusing a product jar containing test fixtures.')
copy2(original, output)
with ZipFile(output, 'a', ZIP_DEFLATED) as isolated:
    for source in classes:
        isolated.write(source, 'BOOT-INF/classes/' + str(fixture / source.name))
print('Prepared backend/target/question-bank-test.jar (isolated fixtures only).')
