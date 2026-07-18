# Changelog

## Unreleased

### Added

- Added state-aware custom tray icon overrides under `custom-icon-overrides`.
- Added `为当前状态设置图标...` editing from Tray Icon Manager rows for the current generated state rule.
- Added `复制状态规则` from the state icon editor.
- Added `重置状态` from the state icon editor.
- Added diagnostics for custom icon scope, current state rule, matched state rule, and state override.
- Added a Cinnamon settings button for opening the Tray Icon Manager directly.
- Added effective icon previews in the Tray Icon Manager for current original, default custom, and state custom icons.
- Added managed storage for file-based custom icons under the applet's Cinnamon config directory.

### Changed

- Existing single custom icon overrides remain the default override for an identity.
- State icon overrides take priority over default overrides when the current original icon rule matches.
- Invalid state icon overrides fall back to the default override for the same identity when one is available.
- Temporary original icon paths fall back to generated tooltip or label state rules.
- Localized visible applet menus, Tray Icon Manager text, and custom icon editor text to Chinese.
- Reorganized the Cinnamon settings dialog into Chinese pages and sections with inline rule guidance.
- Clarified app-hidden versus rule-hidden tray icon states in the Tray Icon Manager.
- Unmanaged tray icons now keep the default left-side position before fixed-order icons.
- File-based custom icon overrides now save managed copies instead of referencing the original external file path.
- Tray Icon Manager dragging now falls back to safe recommended rules when a stable order rule is unavailable.
- Managed ordering now matches those fallback recommended rules against active icons instead of treating them as exact advanced rules.

## [0.3.0] - 2026-07-16

### Added

- Added custom tray icon ordering through the `icon-order` setting.
- Added exact, case-insensitive matching for `name:`, `icon:`, `tooltip:`, and `label:` rules.
- Added support for comments, empty lines, duplicate-rule filtering, and LF/CRLF/CR input.
- Added immediate reordering when the setting or relevant icon properties change.
- Added Tray Icon Manager from the applet context menu.
- Added managed tray icon ordering backed by `managed-icon-order`.
- Added drag-and-drop support for adding active icons to managed order, reordering managed icons, and removing managed icons.
- Added Hide and Show controls in the Tray Icon Manager using exact safe hide rules.
- Added unavailable managed rows so saved managed order survives when applications are closed.
- Added custom tray icon override backend through `custom-icon-overrides`.
- Added support for theme icon name overrides and local PNG/SVG file overrides.
- Added fallback to the original application icon when a saved custom icon override is invalid.
- Added custom icon diagnostics to Tray Icon Info.
- Added `Change icon...` and `Reset icon` controls to the Tray Icon Manager.
- Added an in-dialog custom icon editor for theme icon names and absolute PNG/SVG paths.
- Added inactive custom icon override management.

### Changed

- Matched icons follow custom-rule priority while unmatched icons retain the existing default order.
- Multiline fields are excluded from custom-order matching.
- Managed ordering takes priority over advanced `icon-order` rules while preserving advanced rules outside the managed list.
- Tray Icon Manager refreshes are deferred during drag operations and skipped while editing custom icon values.
- Custom icon overrides use the same stable identity logic as ordering and safe recommended rules.

### Limitations

- Custom icon overrides are single default overrides per identity in this release.
- State-aware custom icon overrides for multi-state applications are not included yet.

### Compatibility

- Verified on Linux Mint 22.3 with Cinnamon 6.6.7.

## [0.2.0] - 2026-07-12

### Added

- Added the Tray Icon Info diagnostic submenu.
- Added per-icon diagnostics for name, icon, tooltip, label, application visibility, rule-hidden state, and effective visibility.
- Added Copy All Diagnostics and Copy Icon Diagnostics actions.
- Added recommended hide rule generation using name, icon, tooltip, and label candidates.
- Added Copy Recommended Rule.
- Added Add Recommended Hide Rule with case-insensitive exact-rule deduplication.
- Added Remove Exact Hide Rule.
- Added removal of all duplicate exact-rule entries in one operation.

### Changed

- Preserved comments, empty lines, rule order, and original line endings when removing exact rules.
- Supported LF, CRLF, CR, and files without a final newline.
- Compressed multiline tray icon names into a single line for menu display.
- Kept copied diagnostic fields in their original multiline form.

### Fixed

- Fixed multiline dynamic names producing invalid multiline name rules.
- Multiline name candidates now fall back to icon, tooltip, or label.
- Betterbird unread-mail indicators now recommend a stable icon rule instead of a dynamic unread-count name rule.

### Compatibility

- Verified on Linux Mint 22.3 with Cinnamon 6.6.7.

## [0.1.0] - 2026-07-11

- Created independent applet fork `fayoo-xapp-status@fayoo` from the local system baseline `xapp-status@cinnamon.org`.
- Created an XApp Status Applet fork with an independent UUID.
- Preserved the system original `xapp-status@cinnamon.org` as the rollback path.
- Updated applet metadata with independent UUID, name, and description.
- Updated the applet log identifier for the fork.
- Added basic install and uninstall scripts for user-local Cinnamon applet deployment.
- Completed development-mode installation with a user-local symbolic link.
- Verified baseline runtime behavior on Linux Mint 22.3 with Cinnamon 6.6.7.
- Added project documentation, changelog, git ignore rules, and license file.
- Added independent CSS classes for tray icons.
- Adjusted horizontal panel tray icon left and right padding to 2px.
- Explicitly vertically centered the tray icon holder.
- Added horizontal and vertical direction classes to the applet container.
- Updated `uninstall.sh` to safely remove `stylesheet.css`.
- Verified tray icon spacing and alignment on Linux Mint 22.3 with Cinnamon 6.6.7.
- Added a global tray icon scale setting.
- Supported icon scale values from 80% to 120% in 5% steps.
- Set the default icon scale to 100%.
- Recalculate scaled icon sizes from Cinnamon's current panel icon size each time.
- Kept RecorderIcon and other Cinnamon applets unaffected by tray icon scaling.
- Verified 80%, 100%, and 120% icon scaling on Linux Mint 22.3 with Cinnamon 6.6.7.
- Added rule-based hiding for XApp tray icons.
- Supported `name`, `icon`, `tooltip`, and `label` fields for hidden icon rules.
- Supported case-insensitive contains matching for hidden icon rules.
- Supported comments and unprefixed general hidden icon rules.
- Applied hidden icon setting changes immediately.
- Combined user-hidden state with each application's own Visible state.
- Re-applied hidden icon matching when icon properties change.
- Verified hidden icon rules alongside global icon scaling on Linux Mint 22.3 with Cinnamon 6.6.7.
