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

To change the scale, open Cinnamon's Applets settings, select `Fayoo XApp Status Applet`, and open its configuration dialog. In the localized settings dialog this is under `常用` -> `显示` -> `托盘图标缩放`.

The applet can also hide selected XApp tray icons by rule. Add rules in the `隐藏的托盘图标` setting, one rule per line, or use `管理托盘图标...` from the applet context menu.

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

The applet can also keep selected XApp tray icons in a fixed rule-based order. Use `管理托盘图标...` for drag-and-drop managed ordering, or add advanced rules in the `自定义图标顺序` setting, one exact rule per line.

- Supported prefixes: `name:`, `icon:`, `tooltip:`, `label:`
- Earlier rules have higher priority inside the fixed-order group.
- Prefixes and field values are case-insensitive, but the full field value must match exactly.
- Empty lines and lines beginning with `#` are ignored.
- Invalid prefixes are ignored.
- Rules without a prefix and fuzzy matching are not supported.
- Multiline fields are not used for custom-order matching.
- Icons that do not match any custom order rule keep Cinnamon's existing default order and appear before the fixed-order group.
- Use `托盘图标信息` to inspect the real field values exposed by each icon.

Example custom icon order rules:

```text
name:telegramdesktop
name:wechat
name:blueman
icon:/opt/betterbird/chrome/icons/default/newmail.svg
```

Use the actual field value for each icon. For example, Blueman should use `name:blueman`, Betterbird unread-mail indicators should use a stable `icon:` rule, and `name:t` will not match `telegramdesktop`.

The Tray Icon Manager is available from the applet context menu as `管理托盘图标...`, and from the settings dialog as `打开托盘图标管理器...`.

- Shows managed-order icons and other active XApp tray icons in one dialog.
- Shows the currently effective icon preview for each active row, including file-based custom icons and state icons.
- Drag active icons into `固定顺序` to keep them in a stable order after the default unmanaged icons.
- Drag managed icons within the managed list to reorder them.
- Drag managed icons to the remove zone to return them to normal ordering.
- Provides `隐藏` and `显示` buttons for exact safe hide rules.
- Preserves manually written advanced `自定义图标顺序` rules outside the managed list.
- Keeps unavailable managed entries visible so their saved order is not lost when an application is closed.

The Tray Icon Manager can also set a custom display icon per stable tray icon identity.

- Click `更换图标...` to choose a theme icon name or an absolute local PNG/SVG file path.
- File-based custom icons are copied into `~/.config/cinnamon/spices/fayoo-xapp-status@fayoo/custom-icons/` when saved, and the saved override points to that managed copy.
- Click `重置图标` to remove the custom icon override and return to the application's original icon.
- Click `为当前状态设置图标...` to set an override for the current detected icon state only.
- State icon overrides use stable original `icon:` values when available, then fall back to a single-line `tooltip:` or `label:` state rule when the icon path is temporary.
- State icon overrides match the generated state rule exactly and take priority over the default override.
- The state icon editor can copy the generated current state rule with `复制状态规则`.
- `重置状态` is available from the state icon editor when the current state already has an override.
- Invalid custom icon values are not saved from the editor.
- If a saved state override becomes invalid, the applet falls back to the default custom icon for that identity when available, then to the original application icon.
- Overrides for inactive icons can be reviewed from `未活动覆盖` when their matching tray icon is not currently active.
- Custom icon identities prefer stable exact rules such as `name:blueman`, then fall back to the recommended safe rule.
- Custom icon overrides do not modify the application's original `icon_name`; they only change this applet's rendered icon.
- Browse dialogs, search, undo, and bulk actions are not included in this release.
- State-aware overrides currently use one exact generated state rule per override; fuzzy state matching is not exposed in the editor.

A diagnostic menu is available to inspect all current XApp tray icon details. Right-click the applet and select `托盘图标信息`.

- Lists every XApp tray icon in real time, including hidden ones.
- Shows `name`, `icon`, `tooltip`, `label`.
- Shows application-visible, hidden-by-rule, and effective-visible states.
- Shows custom icon identity, scope, current state rule, matched state rule, override, validity, error, and rendered source diagnostics.
- Supports copying the recommended hide rule per-icon.
- Supports copying per-icon diagnostic text.
- Supports copying a full diagnostics report for all icons.
- The diagnostic menu is read-only and does not modify any application or icon state.
- Recommended rule candidates are tried in this order: `name` -> `icon` -> `tooltip` -> `label`.
- Stable single-line `name` values are preferred.
- Multiline `name` values are not used as recommended rules; those icons fall back to a more stable `icon`, `tooltip`, or `label` rule when available.
- Supports adding a recommended hide rule directly from the menu (`添加推荐隐藏规则`).
- Adding a rule appends it to the `hidden-icons` setting without deleting, reordering, or reformatting existing rules.
- If the recommended rule already exists the menu shows `移除精确隐藏规则`.
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
