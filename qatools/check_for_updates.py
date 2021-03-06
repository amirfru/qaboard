"""
Checks if an update is available, if yes prints a warning message to stderr.
To avoid introducing extra latency, we only check daily.

FIMXE: users not connected to our internal network will pay a 1s timeout every time.
"""
import os
import datetime
import json
from pathlib import Path

import click


def latest_qatools_version():
  # Everybody install their own local version of qatools,
  # at a different place on Windows, Linux...
  # We simple need a way to let them know they are using an old version
  import requests
  import re
  try:
    # we surely could do something more robust
    r = requests.get('http://gitlab-srv/common-infrastructure/qatools/raw/master/setup.py', timeout=1)
  except:
    return None
  for l in r.text.split('\n'):
    version = re.match('.*version="([0-9]+.[0-9]+.[0-9]+)".*', l)
    if version:
      return version.group(1)


def check_for_updates():
  # qatools user configuration and related files is saved in standard locations
  if os.name != 'nt':
    # On windows we use %LOCALAPPDATA%
    config_home = Path(os.environ['LOCALAPPDATA']) if 'LOCALAPPDATA' in os.environ else Path.home() / '.config'
  else:
    # On linux we use XDG directories
    # https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
    config_home = Path(os.environ['XDG_CONFIG_HOME']) if 'XDG_CONFIG_HOME' in os.environ else Path.home() / '.config'

  qatools_config_dir = config_home / 'qatools'
  if not qatools_config_dir.exists():
    qatools_config_dir.mkdir(parents=True, exist_ok=True)

  # We cache the latest version found 
  qatools_latest_update = qatools_config_dir / 'latest-version'
  if qatools_latest_update.exists():
    try:
      with qatools_latest_update.open() as f:
        latest = json.load(f)
    except: # eg CI starts multiple `qa` runs, and corruption from concurrent writes on an NFS drive...
      try:
        qatools_latest_update.unlink()
      except:
        pass
      latest = None
  else:
    latest = None

  # Check for a latest version at most daily
  now = datetime.datetime.now()
  seconds_since_last_check = (now - datetime.datetime.fromtimestamp(latest['when_checked'])).total_seconds() if latest else None
  if not latest or  seconds_since_last_check > 3600 * 24:
    latest_version = latest_qatools_version()
    if latest_version:
      with qatools_latest_update.open('w') as f:
        json.dump({"version": latest_version, "when_checked": now.timestamp()}, f)
  else:
    latest_version = latest['version']


  if latest_version:
    from qatools import __version__ as current_version
    to_ints = lambda v: [int(n) for n in v.split('.')]
    newer_version_available = to_ints(current_version) < to_ints(latest_version)
    if newer_version_available:
      click.secho(f'A new version of qatools is available! Upgrade to {latest_version}:', fg='yellow', bold=True, err=True)
      click.secho('$ pip install --upgrade --trusted-host pypi.python.org --trusted-host pypi.org --trusted-host files.pythonhosted.org  git+http://gitlab-srv/common-infrastructure/qatools', fg='yellow', err=True)
