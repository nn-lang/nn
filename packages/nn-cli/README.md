# nn-cli

A new CLI generated with oclif

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/nn-cli.svg)](https://npmjs.org/package/nn-cli)
[![Downloads/week](https://img.shields.io/npm/dw/nn-cli.svg)](https://npmjs.org/package/nn-cli)

<!-- toc -->
* [nn-cli](#nn-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @nn-lang/nn-cli
$ nn-cli COMMAND
running command...
$ nn-cli (--version)
@nn-lang/nn-cli/0.1.9 linux-x64 node-v22.15.0
$ nn-cli --help [COMMAND]
USAGE
  $ nn-cli COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`nn-cli check FILE`](#nn-cli-check-file)
* [`nn-cli help [COMMAND]`](#nn-cli-help-command)
* [`nn-cli onnx FILE`](#nn-cli-onnx-file)
* [`nn-cli plugins`](#nn-cli-plugins)
* [`nn-cli plugins:add PLUGIN`](#nn-cli-pluginsadd-plugin)
* [`nn-cli plugins:inspect PLUGIN...`](#nn-cli-pluginsinspect-plugin)
* [`nn-cli plugins:install PLUGIN`](#nn-cli-pluginsinstall-plugin)
* [`nn-cli plugins:link PATH`](#nn-cli-pluginslink-path)
* [`nn-cli plugins:remove [PLUGIN]`](#nn-cli-pluginsremove-plugin)
* [`nn-cli plugins:reset`](#nn-cli-pluginsreset)
* [`nn-cli plugins:uninstall [PLUGIN]`](#nn-cli-pluginsuninstall-plugin)
* [`nn-cli plugins:unlink [PLUGIN]`](#nn-cli-pluginsunlink-plugin)
* [`nn-cli plugins:update`](#nn-cli-pluginsupdate)

## `nn-cli check FILE`

```
USAGE
  $ nn-cli check FILE

ARGUMENTS
  FILE  nn source file path to check
```

_See code: [src/commands/check.ts](https://github.com/nn-lang/nn/blob/v0.1.9/src/commands/check.ts)_

## `nn-cli help [COMMAND]`

Display help for nn-cli.

```
USAGE
  $ nn-cli help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for nn-cli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.28/src/commands/help.ts)_

## `nn-cli onnx FILE`

Compile nn source code to onnx graph

```
USAGE
  $ nn-cli onnx FILE -t <value> -s <value> [-o <value>]

ARGUMENTS
  FILE  File to compile

FLAGS
  -o, --output=<value>  Output file path, defaults to {filename}.onnx
  -s, --size=<value>    (required) Size map for static compilation
  -t, --target=<value>  (required) Target flow name to codegen

DESCRIPTION
  Compile nn source code to onnx graph
```

_See code: [src/commands/onnx.ts](https://github.com/nn-lang/nn/blob/v0.1.9/src/commands/onnx.ts)_

## `nn-cli plugins`

List installed plugins.

```
USAGE
  $ nn-cli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ nn-cli plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/index.ts)_

## `nn-cli plugins:add PLUGIN`

Installs a plugin into nn-cli.

```
USAGE
  $ nn-cli plugins:add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nn-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the NN_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NN_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nn-cli plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ nn-cli plugins:add myplugin

  Install a plugin from a github url.

    $ nn-cli plugins:add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ nn-cli plugins:add someuser/someplugin
```

## `nn-cli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ nn-cli plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ nn-cli plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/inspect.ts)_

## `nn-cli plugins:install PLUGIN`

Installs a plugin into nn-cli.

```
USAGE
  $ nn-cli plugins:install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nn-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the NN_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NN_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nn-cli plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ nn-cli plugins:install myplugin

  Install a plugin from a github url.

    $ nn-cli plugins:install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ nn-cli plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/install.ts)_

## `nn-cli plugins:link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ nn-cli plugins:link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ nn-cli plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/link.ts)_

## `nn-cli plugins:remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nn-cli plugins:remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nn-cli plugins:unlink
  $ nn-cli plugins:remove

EXAMPLES
  $ nn-cli plugins:remove myplugin
```

## `nn-cli plugins:reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ nn-cli plugins:reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/reset.ts)_

## `nn-cli plugins:uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nn-cli plugins:uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nn-cli plugins:unlink
  $ nn-cli plugins:remove

EXAMPLES
  $ nn-cli plugins:uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/uninstall.ts)_

## `nn-cli plugins:unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nn-cli plugins:unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nn-cli plugins:unlink
  $ nn-cli plugins:remove

EXAMPLES
  $ nn-cli plugins:unlink myplugin
```

## `nn-cli plugins:update`

Update installed plugins.

```
USAGE
  $ nn-cli plugins:update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/update.ts)_
<!-- commandsstop -->
