"""
APIs related to parameter tuning
"""
import re
import os
import sys
import json
import datetime
import itertools
import subprocess
from pathlib import Path

import yaml
from flask import request, jsonify
from sqlalchemy.orm.exc import NoResultFound

from qatools.iterators import iter_inputs
from qatools.conventions import deserialize_config

from slamvizapp import app, db_session
from ..models import CiCommit, Project
from ..config import shared_data_directory


def get_groups_path(project_id, name="extra-batches"):
    """
    Return the path of the file where we save the groups of tests we defined for a project.
    Creates it if it does not exist yet.
    """
    path = shared_data_directory / project_id / f"{name}.yml"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w") as f:
            f.write("""# Docs:\n# http://qa-docs/docs/batches-running-on-multiple-inputs""")
    return path



@app.route("/api/v1/tests/groups", methods=["GET", "POST"])
def groups():
    """
    Return or update the groups of tests we defined for a project.
    TODO: We could just make it part of the database, why bother with files...
          It could be saved as test as project.data.test_groups
          We would *just* need to write the migration, and it would save 30 lines of code.
    """
    project_id = request.args["project"]
    groups_path = get_groups_path(project_id)
    if request.method == "POST":
        data = request.get_json()
        try:
          yaml.load(data["groups"], Loader=yaml.SafeLoader)
        except Exception as e:
          return jsonify(str(e)), 400
        with groups_path.open("w") as f:
            f.write(data["groups"])
        return jsonify("OK")
    else:
        try:
            with groups_path.open("r") as f:
                return f.read()
        except:
            return (
                jsonify(
                    {"error": f"Could not open or read {groups_path}"}
                ),
                500,
            )


def get_commit_groups_paths(project, commit_id):
  groups_paths = []
  try:
    ci_commit = CiCommit.query.filter(
        CiCommit.project_id == project.id, CiCommit.hexsha.startswith(commit_id)
    ).one()
    commit_config_inputs = ci_commit.data['qatools_config'].get('inputs', {})
    commit_group_files = commit_config_inputs.get('batches', commit_config_inputs.get('groups', []))
    print(commit_group_files, file=sys.stderr)
    if not (isinstance(commit_group_files, list) or isinstance(commit_group_files, tuple)):
      commit_group_files = [commit_group_files]

    # custom groups have priority over the commit's groups
    for group_file in commit_group_files:
      if (ci_commit.repo_commit_dir / group_file).exists():
        groups_paths.insert(0, ci_commit.repo_commit_dir / group_file)
    return groups_paths
  except NoResultFound:
    return []


@app.route("/api/v1/tests/group")
def get_group():
    if not request.args["name"]:
        return jsonify({"tests": []})

    project_id = request.args["project"]
    project = Project.get_or_create(session=db_session, id=project_id)

    message = None
    groups_paths = [get_groups_path(project_id)]
    commit_id = request.args.get("commit")
    if commit_id:
      commit_groups_paths = get_commit_groups_paths(project, commit_id)
      if not commit_groups_paths:
        message = "<p>Could not load the <code>inputs.batches</code> files defined in <em>qatools.yaml</em>.</p><p>For tuning to work, <code>qa save-artifacts</code> needs to be called.</p>"
      groups_paths = [*commit_groups_paths, *groups_paths]
      try:
          ci_commit = CiCommit.query.filter(
              CiCommit.project_id == project_id,
              CiCommit.hexsha.startswith(commit_id),
          ).one()
      except NoResultFound:
          return jsonify("Sorry, the commit id was not found"), 404
      qatools_config = ci_commit.data["qatools_config"]
    else:
      qatools_config = project.data["qatools_config"]

    default_configuration = qatools_config.get('inputs', {}).get('configuration', "default")
    if not (isinstance(default_configuration, list) or isinstance(default_configuration, tuple)):
      default_configuration = deserialize_config(default_configuration)
    # print('group', request.args["name"], groups_paths)


    has_custom_iter_inputs = False
    # TODO: make it more robust in case of "from iters import *"
    qatools_config['project']['entrypoint'] = ci_commit.repo_commit_dir / qatools_config['project']['entrypoint']
    if qatools_config['project']['entrypoint'].exists():
        with qatools_config['project']['entrypoint'].open() as f:
            entrypoint_source = f.read()
        has_custom_iter_inputs = re.search(r'^\s*(def iter_inputs\(|from .* import.* iter_inputs)', entrypoint_source, re.MULTILINE)
    # prpject fallback?
    if has_custom_iter_inputs:
        cwd = ci_commit.commit_dir
        parent_including_cwd = [*list(reversed(list(cwd.parents))), cwd]
        envrcs = [f'source "{p}/.envrc"\n' for p in parent_including_cwd if (p / '.envrc').exists()]
        cmd = ' '.join([
            'qa',
            'batch',
            *list(itertools.chain.from_iterable((('--batches-file', f'"{f}"') for f in groups_paths))),
            '--list',
            request.args["name"],
        ])
        cmd = '\n'.join([*envrcs, cmd])
        print(cmd)
        try:
            process = subprocess.run(
                ['bash', '-c', cmd],
                cwd=cwd,
                encoding="utf-8",
                capture_output=True,
            )
            # print(cmd)
            # print(process.stdout)
            print(process.stderr)
            process.check_returncode()
        except:
            return jsonify({"error": str(process.stdout), "cmd": str(cmd)}), 500
        return jsonify({"tests": json.loads(process.stdout), "message": message})

    # We don't need to seperate the two cases, but
    # doing so might let us avoid a fork and qa startup...
    try:
        tests = list(
            iter_inputs(
                [request.args["name"]],
                groups_paths,
                project.database,
                default_configuration,
                {},
                qatools_config,
            )
        )
        return jsonify({
            "tests": [{"input_path": str(test.relative_to(database)), "configurations": configuration} for test, configuration, _, database, _ in tests],
            "message": message,
        })
    except Exception as e:
        print(f'Error: {e}')
        return jsonify({"tests": [], "error": str(e)})


@app.route("/api/v1/commit/<hexsha>/batch", methods=["POST"], strict_slashes=False)
def start_tuning(hexsha):
    """
    Request that we run extra tests for a given project.
    """
    project_id = request.args["project"]
    data = request.get_json()

    try:
        ci_commit = CiCommit.query.filter(
            CiCommit.project_id == project_id,
            CiCommit.hexsha.startswith(hexsha)
        ).one()
    except NoResultFound:
        return jsonify("Sorry, the commit id was not found"), 404

    if "qatools_config" not in ci_commit.project.data:
        return jsonify("Please configure `qatools first`"), 404

    ci_commit.latest_output_datetime = datetime.datetime.now()
    ci_commit.latest_output_datetime = datetime.datetime.now()
    batch = ci_commit.get_or_create_batch(data['batch_label'])
    db_session.add(ci_commit)
    db_session.commit()

    if ci_commit.deleted:
        # Now that we updated the last_output_datetime, it won't be deleted again until a little while
        return jsonify("Artifacts for this commit were deleted! Re-run your CI pipeline, or `git checkout / build / qa --ci save-artifacts`"), 404


    groups_paths = [*get_commit_groups_paths(ci_commit.project, hexsha), get_groups_path(project_id)]
    # We store in this directory the scripts used to run this new batch, as well as the logs
    # We may instead want to use the folder where this batch's results are stored
    # Or even store the metadata in the database itself...
    prev_mask = os.umask(000)
    if not batch.output_dir.exists():
        batch.output_dir.mkdir(exist_ok=True, parents=True)
    os.umask(prev_mask)


    working_directory = ci_commit.commit_dir
    print(working_directory)

    # This will make us do automated tuning, versus a single manual batch
    do_optimize = data['tuning_search']['search_type'] == 'optimize'
    if do_optimize:
        # we write somewhere the optimzation search configuration
        # it needs to be accessed from LSF so we can't use temporary files...
        config_path = batch.output_dir / 'optim-config.yaml'
        config_option = f"--config-file '{config_path}'"
        with config_path.open("w") as f:
            f.write(data['tuning_search']['parameter_search'])
    else:
        config_option = f"--tuning-search '{json.dumps(data['tuning_search'])}'"

    overwrite = "--action-on-existing run" if data["overwrite"] == "on" else "--action-on-existing sync"
    # FIXME: cd relative to main project
    batch_command = " ".join(
        [
            "qa",
            f"--platform '{data['platform']}'" if "platform" in data else "",
            f"--label '{data['batch_label']}'",
            "optimize" if do_optimize else "batch",
            ' '.join([f'--batches-file "{p}"' for p in groups_paths]),
            f"--batch '{data['selected_group']}'",
            config_option,
            f"{overwrite} --no-wait" if not do_optimize else '',
            "\n",
        ]
    )
    # print(batch_command)

    # To avoid issues with quoting, we write a script to run the batch,
    # and execute it with bsub/LSF
    # We could also play with heredocs-within-heredocs, but it is painful, and this way we get logs
    # openstf is our Android device farm
    use_openstf = data["android_device"].lower() == "openstf"
    parent_including_cwd = [*list(reversed(list(working_directory.parents))), working_directory]
    envrcs = [f'source "{p}/.envrc"\n' for p in parent_including_cwd if (p / '.envrc').exists()]
    qa_batch_script = "".join(
        [
            "#!/bin/bash\n",
            "set -xe\n\n",
            f'cd "{working_directory}";\n\n',
            ('\n'.join(envrcs) + '\n') if envrcs else "",
            # qa uses click, which hates non-utf8 locales
            'export LC_ALL=en_US.utf8;\n',
            'export LANG=en_US.utf8;\n\n',
            # we avoid DISPLAY issues with matplotlib, since we're headless here
            'export MPLBACKEND=agg;\n',

            f"export RESERVED_ANDROID_DEVICE='{data['android_device']}';\n" if not use_openstf else "",
            # https://unix.stackexchange.com/questions/115129/why-does-root-not-have-usr-local-in-path
            # Those options are specific to android
            f"export RESERVED_ANDROID_DEVICE='{data['android_device']}';\n" if not use_openstf else "",
            f"export OPENSTF_STORAGE_QUOTA=12;\n" if not use_openstf else "",

            # Make sure qatools doesn't complain about not being in a git repository and knows where to save results
            f"\nexport CI=true;\n",
            f"export CI_COMMIT_SHA='{ci_commit.gitcommit.hexsha}';\n",
            f"export QATOOLS_CI_COMMIT_DIR='{ci_commit.commit_dir}';\n\n",
            batch_command,
        ]
    )
    print(qa_batch_script)
    qa_batch_path = batch.output_dir / f"qa_batch.sh"
    with qa_batch_path.open("w") as f:
        f.write(qa_batch_script)

    qatools_config = ci_commit.project.data["qatools_config"]
    lsf_config = qatools_config.get('runners', qatools_config).get("lsf", {})
    default_user = lsf_config.get('user')
    user = data.get('user', default_user)
    if not user:
        return jsonify("You must provide a user as whom to run the tuning experiment."), 403

    queue = lsf_config.get("fast_queue", lsf_config['queue'])
    start_script = "".join(
        [
            "#!/bin/bash\n",
            "set -xe\n\n",
            f'mkdir -p "{batch.output_dir}"\n',
            f'bsub_su "{user}" -q "{queue}" ',
            '-sp 4000 ', # highest priority for manual runs
            ## LSF refuses to give us long-running jobs....
            ## '-W 24:00 ' if do_optimize else '-sp 4000 ', # highest priority for manual runs
            f'-o "{batch.output_dir}/log.txt" << "EOF"\n',
            f'\tssh -o StrictHostKeyChecking=no -q {user}@{user}-vdi \'bash "{qa_batch_path}"\'',
            '\nEOF'
        ]
    )
    print(start_script)


    start_path = batch.output_dir / f"start.sh"
    with start_path.open("w") as f:
        f.write(start_script)

    # Wraps and execute the script that starts the batch
    cmd = " ".join(
        [
            # there is only C.utf8 on our container, but it is not available on LSF
            "LC_ALL=en_US.utf8 LANG=en_US.utf8",
            "ssh",
            # quiet to avoid the welcome banner
            "-q",
            # ask, and force a TTY, otherwise bsub->su will complain
            "-tt",
            # make sure we OK the server key during the first-connection
            "-o StrictHostKeyChecking=no",
            # ispq is the only user that can use bsub_su, an alias for sudo -i -u {0} {1:}.
            "-i /home/arthurf/.ssh/ispq.id_rsa",
            "ispq@ispq-vdi",
            f'\'bash "{start_path}"\'',
        ]
    )
    print(cmd)

    try:
        out = subprocess.run(cmd, shell=True, encoding="utf-8", stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        out.check_returncode()
        print(out.stdout)
    except:
        return jsonify({"error": str(out.stdout), "cmd": str(cmd)}), 500
    return jsonify({"cmd": str(cmd), "stdout": str(out.stdout)})
