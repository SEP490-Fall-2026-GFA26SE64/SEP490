#!/usr/bin/env python3
"""Adopt the user-approved saved Module snapshot into the dedicated local database."""
import os
import shutil
import subprocess
from accounts import STATE, settings

values = settings()
classpath = os.pathsep.join(str(STATE / part) for part in ['seed', 'classes', 'libs/*'])
java = str(os.path.join(os.environ['JAVA_HOME'], 'bin/java')) if os.environ.get('JAVA_HOME') else shutil.which('java')
subprocess.run([java, '-cp', classpath, 'com.adaptlearngraph.development.DevModulesAdoption'],
               env={**os.environ, **values, 'DEV_MODULE_SNAPSHOT': str(STATE / 'legacy-module-snapshot.json')}, check=True)
