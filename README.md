# Fayoo XApp Status · v0.3.0

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

This project started as a minimal fork and now includes tray presentation customizations, rule-based visibility, diagnostics, managed ordering, and custom tray icon overrides. Tray icon click handling, scroll handling, application visibility handling, and XApp monitor logic remain based on the system applet baseline.

The current baseline has been verified to install in development mode and run on Linux Mint 22.3 `zena` with Cinnamon `6.6.7+zena` and XApp `3.2.2+zena`.

## Features

The applet provides a global tray icon scale setting for the XApp tray icons it hosts.

- Supported values: `80%`, `85%`, `90%`, `95%`, `100%`, `105%`, `110%`, `115%`, `120%`
- Default value: `100%`
- Scope: only XApp tray icons shown by `fayoo-xapp-status@fayoo`
- The setting does not change Cinnamon panel height and does not affect other applets.

To change the scale, open Cinnamon's Applets settings, select `Fayoo XApp Status Applet`, and open its configuration dialog.

The applet can also hide selected XApp tray icons by rule. Add rules in the `Hidden tray icons` setting, one rule per line, or use `Manage Tray Icons...` from the applet context menu.

- Supported prefixes: `name:`, `icon:`, `tooltip:`, `label:`
- Prefixes and matched text are case-insensitive.
- Matching uses plain contains matching, not regular expressions.
- Lines beginning with `#` are comments.
- Rules without a prefix match all supported fields: name, icon, tooltip, and label.
- Prefer complete, stable `name:` rules when possible.
- Very short rules can match multiple icons, for example `name:t`.
- Do not use D-Bus unique names like `:1.xxx`, object paths, or temporary PNG paths as rules.

Example hidden icon rules:

```text
name:wechat
name:blueman
name:telegramdesktop
icon:fayoo-fcitx-pinyin
tooltip:Clash Party
```

The applet can also place selected XApp tray icons first by rule. Use `Manage Tray Icons...` for drag-and-drop managed ordering, or add advanced rules in the `Custom icon order` setting, one exact rule per line.

- Supported prefixes: `name:`, `icon:`, `tooltip:`, `label:`
- Earlier rules have higher priority.
- Prefixes and field values are case-insensitive, but the full field value must match exactly.
- Empty lines and lines beginning with `#` are ignored.
- Invalid prefixes are ignored.
- Rules without a prefix and fuzzy matching are not supported.
- Multiline fields are not used for custom-order matching.
- Icons that do not match any custom order rule keep Cinnamon's existing default order.
- Use `Tray Icon Info` to inspect the real field values exposed by each icon.

Example custom icon order rules:

```text
name:telegramdesktop
name:wechat
name:blueman
icon:/opt/betterbird/chrome/icons/default/newmail.svg
```

Use the actual field value for each icon. For example, Blueman should use `name:blueman`, Betterbird unread-mail indicators should use a stable `icon:` rule, and `name:t` will not match `telegramdesktop`.

The Tray Icon Manager is available from the applet context menu as `Manage Tray Icons...`.

- Shows managed-order icons and other active XApp tray icons in one dialog.
- Drag active icons into `Managed order` to place them first.
- Drag managed icons within the managed list to reorder them.
- Drag managed icons to the remove zone to return them to normal ordering.
- Provides Hide and Show buttons for exact safe hide rules.
- Preserves manually written advanced `Custom icon order` rules outside the managed list.
- Keeps unavailable managed entries visible so their saved order is not lost when an application is closed.

The Tray Icon Manager can also set a custom display icon per stable tray icon identity.

- Click `Change icon...` to choose a theme icon name or an absolute local PNG/SVG file path.
- Click `Reset icon` to remove the custom icon override and return to the application's original icon.
- Invalid custom icon values are not saved from the editor.
- If an existing saved override becomes invalid, the applet falls back to the original application icon.
- Inactive overrides can be reviewed from `Inactive overrides` when their matching tray icon is not currently active.
- Custom icon identities prefer stable exact rules such as `name:blueman`, then fall back to the recommended safe rule.
- Custom icon overrides do not modify the application's original `icon_name`; they only change this applet's rendered icon.
- Browse dialogs, search, undo, and bulk actions are not included in this release.
- Custom icon overrides are currently single default overrides per identity. State-aware overrides for multi-state applications are planned separately.

A diagnostic menu is available to inspect all current XApp tray icon details. Right-click the applet and select `Tray Icon Info`.

- Lists every XApp tray icon in real time, including hidden ones.
- Shows `name`, `icon`, `tooltip`, `label`.
- Shows application-visible, hidden-by-rule, and effective-visible states.
- Shows custom icon identity, override, validity, error, and rendered source diagnostics.
- Supports copying the recommended hide rule per-icon.
- Supports copying per-icon diagnostic text.
- Supports copying a full diagnostics report for all icons.
- The diagnostic menu is read-only and does not modify any application or icon state.
- Recommended rule candidates are tried in this order: `name` -> `icon` -> `tooltip` -> `label`.
- Stable single-line `name` values are preferred.
- Multiline `name` values are not used as recommended rules; those icons fall back to a more stable `icon`, `tooltip`, or `label` rule when available.
- Supports adding a recommended hide rule directly from the menu (`Add Recommended Hide Rule`).
- Adding a rule appends it to the `hidden-icons` setting without deleting, reordering, or reformatting existing rules.
- If the recommended rule already exists the menu shows `Remove Exact Hide Rule`.
- Removing a rule deletes only valid rule lines that case-insensitively and completely match the recommended rule.
- All duplicate exact rules are removed at once, including lines with different casing or surrounding spaces.
- Comments, broader rules, partial matches, rules for other fields, and unrelated lines are not removed.
- If another rule still matches the icon after removal, the icon remains hidden.
- Rule deduplication is case-insensitive and compares the complete rule text only.
- Broader existing rules do not prevent adding a more specific recommended rule.
- Broad rules such as `name:t` are not automatically removed or cleaned up.
- The menu does not currently provide a confirmation dialog, undo action, or automatic cleanup of broader rules.

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
