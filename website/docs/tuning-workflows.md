---
id: tuning-workflows
sidebar_label: Tuning Workflows
title: "Various Tuning Workflows"
---

## Enabling tuning from QA-Board
1. **Define artifacts:** you must define the "artifacts" needed to run your software. Besides the source, you might need compiled binaries, configurations, trained networks, etc. Artifacts are defined in [qatools.yaml](https://github.com/Samsung/qaboard/blob/master/qatools/sample_project/qatools.yaml#L85):

```yaml
artifacts:
  binary:
    glob: 'build/sample_project'
  # The "configurations" artifacts are shown in the UI under the commit's "Configuration" tab
  configurations:
    glob: configurations/*.json
```

> For convenience, *.qatools.yaml* and *qatools/* are saved automatically.

2. **Save the artifacts** when your build/training is done. In your CI, you will want to execute:

```bash
qa save-artifacts
```

## Tuning from QA-Board
When doing QA or during development, you often want to run the code/configs from a given commit on new tests. QA-Board lets you define and runs batches of tests with extra tuning parameters:

![Tuning from the UI](/img/tuning-from-the-ui.jpg)

## Investigating results/configs you see in the UI
Every time you see an output in the web application, you see what configurations were used, and you can easily open the output directory:

![Copy the Windows output dir](/img/output-windows-dir.jpg)

![Output directory from Windows](/img/winows-explorer-output-dir.jpg)

> The output logs always show you the exact CLI commands that were used, so that reproducing results is only a `git checkout $revision ; make ; qa run` away.


## Workflows used for Tuning
### **Local** Workflow
If you already have great development/debugging tools, use them!
- At SIRC, `CDE` provides a great environment to run hardware chains and view images.**
- For deep learning `tensorboard` is a great tool to investigate NNs.
- Many people love to write one-off `matlab` script.

> You can continue to use the existing tools!

This said, it's worth having your IDE/debugger/scripts call your code via qatools' CLI. [Here is how to do it](debugging).

### **Local configs > SharedStorage > Tuning from QA-Board** Workflow
> Details: WIP

### **Local > QA-Board** Workflow
QA-Board lets you runs your *local* code/configurations, and see results in the web application. **It gives you an easy way to tweak/compile/run your code and compare results across runs:**

```bash
qa --share run [...]
qa --share --label testing-some-logic-tweaks batch [...]
```

Results will appear in a new batch:

![selecting local runs](/img/selecting-local-runs.jpg)
![local runs warning](/img/local-runs-warning.jpg)


### **Commit > CI > QA-Board** Qorkflow
If you make changes in configuration files, you need to commit them.
1. Make changes
2. Commit the changes
3. Push your commit
4. See results in the UI
