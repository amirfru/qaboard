---
id: debugging-runs-with-an-IDE
title: Debugging qatools' runs in an IDE
sidebar_label: Debugging with IDEs
---

## Debugging with PyCharm
Edit your "debug configurations" like this:

- **Module name:** qatools *(make sure you select "module" not "script" in the dropdown menu).*
- **Parameters:** CLI parameters for `qa`: **`run -i images/A.jpg`**.
- **Working directory:** Check it’s defined as the directory with *qatools.yaml*. If this directory happens to have a subfolder named "qatools", use it.


![pyCharm setup](/img/pycharm-debugging-setup.png)

> In some cases you'll also need to define as environment variables `LC_ALL=en_US.utf8 LANG=en_US.utf8`

## Debugging with VSCode
To configure debugging, the editor opens a file called *launch.json*. You want to add configurations that look like those:

```json
{
  "name": "qatools",
  "type": "python",
  "request": "launch",
  "module": "qatools",
  "args": [
    "--", // needed...
    "--help",
  ]
},
```

```json
{
  "--",
  "--inputs-database",
  ".",
  "run",
  "--input-path",
  "tv/tv_GW1_9296x256_REMOSAIC_V1_FULL_X_HP_PDA1",
}
```

Here is a more in-depth review of your options at https://code.visualstudio.com/docs/python/debugging
