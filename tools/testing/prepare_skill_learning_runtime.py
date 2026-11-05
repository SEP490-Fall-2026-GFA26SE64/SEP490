#!/usr/bin/env python3
"""Package only the two opt-in test runtimes into a COPY of the already-built app jar.

Prerequisite: bash backend/mvnw -f backend/pom.xml -DskipTests package
The product jar is never modified, and this script neither starts services nor reads secrets.
"""
from pathlib import Path
import shutil
import zipfile
ROOT=Path(__file__).resolve().parents[2]
def main():
    target=ROOT/'backend/target'
    source=target/'adapt-learn-graph.jar';output=target/'skill-learning-test.jar'
    if not source.is_file():raise SystemExit('Build the application and test classes first.')
    classes=[]
    for prefix in ['QuestionBankTestRuntime','SkillLearningTestRuntime']:
        selected=list((target/'test-classes/com/adaptlearngraph/config').glob(prefix+'*.class'))
        if not selected:raise SystemExit('Missing compiled test runtime: '+prefix)
        classes.extend(selected)
    with zipfile.ZipFile(source) as jar:
        if any('SkillLearningTestRuntime' in name for name in jar.namelist()):raise SystemExit('Product jar unexpectedly contains test runtime.')
    shutil.copyfile(source,output)
    with zipfile.ZipFile(output,'a') as jar:
        for path in classes:jar.write(path,'BOOT-INF/classes/'+str(path.relative_to(target/'test-classes')))
    print('Prepared backend/target/skill-learning-test.jar; product jar unchanged.')
if __name__=='__main__':main()
