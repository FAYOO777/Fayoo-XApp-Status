# Changelog

## Unreleased

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
