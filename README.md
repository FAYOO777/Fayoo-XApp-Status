# Fayoo XApp Status

Personal independent fork of Linux Mint Cinnamon's `xapp-status@cinnamon.org` applet.

This project is based on the system copy shipped with this machine:

- Linux Mint: `22.3 zena`
- Cinnamon: `6.6.7+zena`
- XApp: `3.2.2+zena`
- Upstream source: Linux Mint Cinnamon, `xapp-status@cinnamon.org`

## Project Goal

The goal is to keep the original Cinnamon XApp status applet available while developing a separate personal version under a new UUID:

`fayoo-xapp-status@fayoo`

This repository does not modify files under `/usr/share` and does not replace `xapp-sn-watcher`.

## Current Stage

This is a minimal fork only. It changes the applet UUID, display name, description, and log identifier.

No custom tray features have been added yet. Tray icon display, sorting, click handling, scroll handling, visibility handling, and XApp monitor logic remain based on the system applet baseline.

The current baseline has been verified to install in development mode and run on Linux Mint 22.3 `zena` with Cinnamon `6.6.7+zena` and XApp `3.2.2+zena`.

## Component Relationship

Applications expose tray items through `StatusNotifierItem` interfaces. The system `xapp-sn-watcher` service registers as `org.x.StatusNotifierWatcher`, implements the `org.kde.StatusNotifierWatcher` watcher role, and exports XApp status icon objects.

Cinnamon's applet layer uses `XApp.StatusIconMonitor` to discover those exported status icon objects. The applet then wraps each proxy in a Cinnamon/St actor and displays it on the panel.

The flow is:

```text
Application StatusNotifierItem
-> xapp-sn-watcher
-> org.x.StatusIcon objects
-> XApp.StatusIconMonitor
-> Cinnamon applet actor
-> panel
```

## Install

Run from this repository root:

```sh
./install.sh
```

This copies the applet to:

`~/.local/share/cinnamon/applets/fayoo-xapp-status@fayoo`

The script does not enable the applet and does not restart Cinnamon.

## Development Install

Run from this repository root:

```sh
./install.sh --dev
```

This creates a symbolic link from:

`~/.local/share/cinnamon/applets/fayoo-xapp-status@fayoo`

to this repository's `fayoo-xapp-status@fayoo` directory.

## Uninstall

Run from this repository root:

```sh
./uninstall.sh
```

This removes only:

`~/.local/share/cinnamon/applets/fayoo-xapp-status@fayoo`

It does not delete this repository, does not modify the system applet, and does not touch `/usr/share`.

## Original And Forked Applets

Do not enable the original `xapp-status@cinnamon.org` and this fork at the same time. Running both can display duplicate tray icons because both applets consume the same XApp status icon monitor data.

## Rollback

To return to the system applet:

1. Disable or remove `fayoo-xapp-status@fayoo` from the Cinnamon panel.
2. Run `./uninstall.sh` if you want to remove the user-installed fork files.
3. Add or re-enable the original `xapp-status@cinnamon.org` applet from Cinnamon's applet settings.

The original system applet remains installed under `/usr/share/cinnamon/applets/xapp-status@cinnamon.org`.

## License

This fork is based on Linux Mint Cinnamon. The installed Cinnamon package declares the upstream project license for `Files: *` as `GPL-2+`. This repository follows `GPL-2.0-or-later`; see `LICENSE`.
