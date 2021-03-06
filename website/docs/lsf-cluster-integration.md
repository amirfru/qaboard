---
id: lsf-integration
title: LSF Integration
sidebar_label: LSF Integration
---

QA-Board can use the LSF job management system to submit batch jobs.

:::important Reminder
If you don't want to use LSF, [read here how to make `qa batch` use a different backend](using-the-qa-cli#batch-runners).
:::

:::tip
LSF jobs sent by `qa` will have use your project's name as LSF project (`-P`).
:::

## LSF project options
You can change the default LSF configuration with:

```yaml
# qatools.yaml
runners:
  # In doubt, ask advice from your manager / CAD / bqueues.
  lsf:
    user: username
    queue: your_queue
    # qatools uses a fast queue to launch jobs that create subsequent LSF jobs
    # It helps get faster feeback about which outputs are pending
    # fast_queue: your_queue
    # threads: 0        # ask for eg 8 max threads when sending jobs to LSF (0=default)
    # memory: 0         # ask for eg 8000M memory when sending jobs to LSF (0=default)
```

:::warning
`qa` doesn't use LSF's job arrays. If your algorithm takes very little time to run, maybe using them would be better. Create an issue or contact [Arthur Flam](mailto:arthur.flam@samsung.com). 
:::

## LSF options per batch

```yaml {3-5}
# qa/batches.yaml
you-can-give-an-LSF-configuration:
  lsf:
    memory: 1000
    threads: 1000
  configurations:
    - base
  inputs:
  - images/A.jpg
  - images/B.jpg
```

```yaml {2-3,8-10}
you-can-give-an-LSF-configuration-per-input:
  lsf:
    memory: 1000
  configuration:
    - base
  inputs:
    images/A.jpg:
    images/B.jpg:
      lsf:
        memory: 200
```

## LSF options on the CLI
You can use CLI options to override the defaults:

```bash
qa batch --help
# --snip--
  --lsf-threads INTEGER           restrict number of lsf threads to use. 0=no restriction
  --lsf-memory INTEGER            restrict memory (MB) to use. 0=no restriction
  --lsf-resources TEXT            LSF resources restrictions (-R)
  --lsf-sequential / --lsf-parallel
```