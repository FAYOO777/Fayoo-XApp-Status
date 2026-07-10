# Changelog

## Unreleased

- Added `Tray Icon Info` right-click submenu.
- Added real-time diagnostic information for current XApp tray icons.
- Added recommended hide rule generation.
- Added per-icon and full diagnostic information copying.
- Supported viewing effective visibility state of hidden icons.
- Verified tray icon diagnostics on Linux Mint 22.3 with Cinnamon 6.6.7.
- Added one-click addition of recommended hide rules from `Tray Icon Info`.
- Preserved original user rule text format when appending rules.
- Supported case-insensitive complete-rule deduplication.
- Applied hide state immediately after adding a rule.
- Showed non-clickable status when a rule already exists.
- Verified one-click hide rules on Linux Mint 22.3 with Cinnamon 6.6.7.

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
