const Cinnamon = imports.gi.Cinnamon;
const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Clutter = imports.gi.Clutter;
const Pango = imports.gi.Pango;
const Interfaces = imports.misc.interfaces;
const Applet = imports.ui.applet;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Settings = imports.ui.settings;
const SignalManager = imports.misc.signalManager;
const Gtk = imports.gi.Gtk;
const XApp = imports.gi.XApp;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;
const Tooltips = imports.ui.tooltips;
const ModalDialog = imports.ui.modalDialog;

const HORIZONTAL_STYLE = 'padding-left: 2px; padding-right: 2px; padding-top: 0; padding-bottom: 0';
const VERTICAL_STYLE = 'padding-left: 0; padding-right: 0; padding-top: 2px; padding-bottom: 2px';
const CONTAINER_STYLE_CLASS = 'fayoo-xapp-status-container';
const HORIZONTAL_STYLE_CLASS = 'fayoo-xapp-status-horizontal';
const VERTICAL_STYLE_CLASS = 'fayoo-xapp-status-vertical';


class RecorderIcon {
    constructor(applet) {
        this.applet = applet;
        this.actor = new St.BoxLayout({
            style_class: "applet-box",
            reactive: false,
            visible: false,
            x_expand: true,
            y_expand: true
        });

        this.icon_holder = new St.Bin();
        this.iconSize = this.applet.getPanelIconSize(St.IconType.FULLCOLOR);

        this.actor.add_actor(this.icon_holder);

        this._indicator = new St.DrawingArea();
        this._indicator.connect("repaint", (area) => this._paint(area));
        this.icon_holder.add_actor(this._indicator);

        this._recordListenerId = Main.screenRecorder.connect("recording", () => this._recordingStateChanged());
        this._recordingStateChanged();

        this.refresh();
    }

    _recordingStateChanged() {
        this.actor.visible = Main.screenRecorder.recording;
        this._indicator.queue_repaint();
    }

    _paint(area) {
        let [width, height] = area.get_surface_size();
        let size = Math.max(width, height);
        let node = area.get_theme_node();
        let border = node.get_foreground_color();

        let cr = area.get_context();

        let color = new Clutter.Color({ red: 255, green: 0, blue: 0, alpha: 255 });
        Clutter.cairo_set_source_color(cr, color);

        cr.arc(
            width / 2,
            height / 2,
            size / 4.0,
            0.0,
            2.0 * Math.PI
        )

        cr.fillPreserve();
        Clutter.cairo_set_source_color(cr, border);
        cr.stroke();
        cr.$dispose();
    }

    refresh() {
        this.setOrientation(this.applet.orientation);
        this._indicator.set_size(this.iconSize, this.iconSize);
        this._indicator.queue_repaint();
    }

    setOrientation(orientation) {
        switch (orientation) {
            case St.Side.TOP:
            case St.Side.BOTTOM:
                this.actor.vertical = false;
                this.actor.remove_style_class_name("vertical");
                break;
            case St.Side.LEFT:
            case St.Side.RIGHT:
                this.actor.vertical = true;
                this.actor.add_style_class_name("vertical");
                break;
        }
    }

    destroy() {
        if (this._recordListenerId > 0) {
            Main.screenRecorder.disconnect(this._recordListenerId);
            this._recordListenerId = 0;
        }
        this.actor.destroy();
    }
}

class XAppStatusIcon {
    constructor(applet, proxy) {
        this.name = proxy.get_name();
        this.applet = applet;
        this.proxy = proxy;

        this.iconName = null;
        this.applicationVisible = true;

        this.actor = new St.BoxLayout({
            style_class: "applet-box fayoo-xapp-status-icon",
            reactive: !global.settings.get_boolean('panel-edit-mode'),
            track_hover: true,
            // The systray use a layout manager, we need to fill the space of the actor
            // or otherwise the menu will be displayed inside the panel.
            x_expand: true,
            y_expand: true
        });

        this.icon_holder = new St.Bin({
            style_class: "fayoo-xapp-status-icon-holder",
            y_align: St.Align.MIDDLE
        });
        this.iconSize = this.applet.getPanelIconSize(St.IconType.FULLCOLOR);

        this.proxy.icon_size = this.iconSize;

        this.label = new St.Label({
            'y-align': St.Align.END,
        });

        this.actor.add_actor(this.icon_holder);
        this.actor.add_actor(this.label);

        this._tooltip = new Tooltips.PanelItemTooltip(this, "", applet.orientation);

        this.actor.connect('button-press-event', Lang.bind(this, this.onButtonPressEvent));
        this.actor.connect('button-release-event', Lang.bind(this, this.onButtonReleaseEvent));
        this.actor.connect('scroll-event', (...args) => this.onScrollEvent(...args));
        this.actor.connect('enter-event', Lang.bind(this, this.onEnterEvent));

        this._proxy_prop_change_id = this.proxy.connect('g-properties-changed', Lang.bind(this, this.on_properties_changed))

        this.refresh();
    }

    on_properties_changed(proxy, changed_props, invalidated_props) {
        let prop_names = changed_props.deep_unpack();
        let shouldResort = false;

        if ('IconName' in prop_names) {
            this.setIconName(proxy.icon_name);
            shouldResort = true;
        }
        if ('TooltipText' in prop_names) {
            this.setTooltipText(proxy.tooltip_text);
            shouldResort = true;
        }
        if ('Label' in prop_names) {
            this.setLabel(proxy.label);
            shouldResort = true;
        }
        if ('Visible' in prop_names) {
            this.setVisible(proxy.visible);
        }
        if ('Name' in prop_names) {
            shouldResort = true;
        }

        if ('Name' in prop_names ||
            'IconName' in prop_names ||
            'TooltipText' in prop_names ||
            'Label' in prop_names) {
            this.updateEffectiveVisibility();
        }

        if (shouldResort) {
            this.applet.sortIcons();
        }

        if (shouldResort || 'Visible' in prop_names) {
            this.applet.scheduleTrayIconManagerRefresh();
        }

        if ('PrimaryMenuIsOpen' in prop_names) {
            if (!proxy.primary_menu_is_open) {
                this.actor.sync_hover();
            }
        }
        if ('SecondaryMenuIsOpen' in prop_names) {
            if (!proxy.secondary_menu_is_open) {
                this.actor.sync_hover();
            }
        }
        return;
    }

    refresh() {
        this.setIconName(this.proxy.icon_name);
        this.setLabel(this.proxy.label);
        this.setTooltipText(this.proxy.tooltip_text);
        this.setVisible(this.proxy.visible);
        this.setOrientation(this.applet.orientation);

        this.actor.queue_relayout();
    }

    setOrientation(orientation) {
        switch (orientation) {
            case St.Side.TOP:
            case St.Side.BOTTOM:
                this.actor.vertical = false;
                this.actor.remove_style_class_name("vertical");
                break;
            case St.Side.LEFT:
            case St.Side.RIGHT:
                this.actor.vertical = true;
                this.actor.add_style_class_name("vertical");
                break;
        }
    }

    setIconName(iconName) {
        if (iconName) {
            let type, icon;

            if (iconName.match(/symbolic/)) {
                type = St.IconType.SYMBOLIC;
            }
            else {
                type = St.IconType.FULLCOLOR;
            }

            this.iconName = iconName;
            const baseIconSize = this.applet.getPanelIconSize(type);
            this.iconSize = this.applet.getScaledIconSize(baseIconSize);
            this.proxy.icon_size = this.iconSize;

            // Assume symbolic icons would always be square/suitable for an StIcon.
            if (iconName.includes("/") && type != St.IconType.SYMBOLIC) {
                this.icon_loader_handle = St.TextureCache.get_default().load_image_from_file_async(
                    iconName,
                    /* If top/bottom panel, allow the image to expand horizontally,
                     * otherwise, restrict it to a square (but keep aspect ratio.) */
                    this.actor.vertical ? this.iconSize : -1,
                    this.iconSize,
                    (...args)=>this._onImageLoaded(...args)
                );

                return;
            }
            else {
                icon = new St.Icon( { "icon-type": type, "icon-size": this.iconSize, "icon-name": iconName });
                this.icon_holder.show();
                this.icon_holder.child = icon;
            }
        }
        else {
            this.iconName = null;
            this.icon_holder.hide();
        }
    }

    _onImageLoaded(cache, handle, actor, data=null) {
        if (handle !== this.icon_loader_handle) {
            global.logError(`fayoo-xapp-status@fayoo: Icon or image seems out of sync (${this.name}`);
            return;
        }

        this.icon_holder.child = actor;
        this.icon_holder.show();
    }

    setTooltipText(tooltipText) {
        if (tooltipText) {
            this._tooltip.preventShow = false;
        }
        else {
            tooltipText = "";
            this._tooltip.preventShow = true;
        }
        this._tooltip.set_markup(tooltipText);
        // If the tooltip is currently visible, then we might need to trigger a realignment of the tooltip after changing the text length
        if (this._tooltip.visible) {
           this._tooltip.hide();
           this._tooltip.show();
        }
    }

    setLabel(label) {
        if (label) {
            this.label.set_text(label);
        } else {
            this.label.set_text("");
        }

        this.show_label = (this.applet.orientation == St.Side.TOP || this.applet.orientation == St.Side.BOTTOM) &&
                           this.proxy.label.length > 0;

        this.label.visible = this.show_label;
    }

    setVisible(visible) {
        this.applicationVisible = Boolean(visible);
        this.updateEffectiveVisibility();
    }

    updateEffectiveVisibility() {
        const visible = this.applicationVisible && !this.applet.isStatusIconHidden(this.proxy);

        if (visible) {
            this.actor.show();
        }
        else {
            this.actor.hide();
        }
    }

    onEnterEvent(actor, event) {
        this._tooltip.preventShow = false;
    }

    getEventPositionInfo(actor) {
        let allocation = Cinnamon.util_get_transformed_allocation(actor);

        let x = Math.round(allocation.x1 / global.ui_scale);
        let y = Math.round(allocation.y1 / global.ui_scale);
        let w = Math.round((allocation.x2 - allocation.x1) / global.ui_scale)
        let h = Math.round((allocation.y2 - allocation.y1) / global.ui_scale)

        let final_x, final_y, final_o;

        switch (this.applet.orientation) {
            case St.Side.TOP:
                final_x = x;
                final_y = y + h;
                final_o = Gtk.PositionType.TOP;
                break;
            case St.Side.BOTTOM:
            default:
                final_x = x;
                final_y = y;
                final_o = Gtk.PositionType.BOTTOM;
                break;
            case St.Side.LEFT:
                final_x = x + w;
                final_y = y
                final_o = Gtk.PositionType.LEFT;
                break;
            case St.Side.RIGHT:
                final_x = x;
                final_y = y;
                final_o = Gtk.PositionType.RIGHT;
                break;
        }

        return [final_x, final_y, final_o];
    }

    onButtonPressEvent(actor, event) {
        this._tooltip.hide();
        this._tooltip.preventShow = true;

        if (event.get_button() == Clutter.BUTTON_SECONDARY && event.get_state() & Clutter.ModifierType.CONTROL_MASK) {
            return Clutter.EVENT_PROPAGATE;
        }

        let [x, y, o] = this.getEventPositionInfo(actor);

        this.proxy.call_button_press(x, y, event.get_button(), event.get_time(), o, null, null);

        return Clutter.EVENT_STOP;
    }

    onButtonReleaseEvent(actor, event) {
        let [x, y, o] = this.getEventPositionInfo(actor);

        this.proxy.call_button_release(x, y, event.get_button(), event.get_time(), o, null, null);

        return Clutter.EVENT_STOP;
    }

    onScrollEvent(actor, event) {
        let direction = event.get_scroll_direction();

        if (direction != Clutter.ScrollDirection.SMOOTH) {
            let x_dir = XApp.ScrollDirection.UP;
            let delta = 0;

            if (direction == Clutter.ScrollDirection.UP) {
                x_dir = XApp.ScrollDirection.UP;
                delta = -1;
            } else if (direction == Clutter.ScrollDirection.DOWN) {
                x_dir = XApp.ScrollDirection.DOWN;
                delta = 1;
            } else if (direction == Clutter.ScrollDirection.LEFT) {
                x_dir = XApp.ScrollDirection.LEFT;
                delta = -1;
            } else if (direction == Clutter.ScrollDirection.RIGHT) {
                x_dir = XApp.ScrollDirection.RIGHT;
                delta = 1;
            }

            this.proxy.call_scroll(delta, x_dir, event.get_time(), null, null);
        }

        return Clutter.EVENT_STOP;
    }

    destroy() {
        this.proxy.disconnect(this._proxy_prop_change_id);
        this._proxy_prop_change_id = 0;
        this._tooltip.destroy();
    }
}

class CinnamonXAppStatusApplet extends Applet.Applet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

        this.orientation = orientation;

        this.setAllowedLayout(Applet.AllowedLayout.BOTH);

        this.actor.remove_style_class_name('applet-box');
        this.actor.set_important(true);  // ensure we get class details from the default theme if not present

        if (this.orientation == St.Side.TOP || this.orientation == St.Side.BOTTOM) {
            this.manager_container = new St.BoxLayout( { vertical: false, style: HORIZONTAL_STYLE, style_class: CONTAINER_STYLE_CLASS });
        } else {
            this.manager_container = new St.BoxLayout( { vertical: true, style: VERTICAL_STYLE, style_class: CONTAINER_STYLE_CLASS });
        }

        this.setContainerOrientationClass(this.orientation);

        this.actor.add_actor (this.manager_container);
        this.manager_container.show();

        this._recording_indicator = new RecorderIcon(this);
        this.manager_container.add_actor(this._recording_indicator.actor);

        this.statusIcons = {};
        this.hiddenIconRules = [];
        this.managedIconOrderRules = [];
        this.iconOrderRules = [];
        this.effectiveIconOrderRules = [];
        this._trayIconManagerDialog = null;
        this._trayIconManagerContent = null;
        this._trayIconManagerTooltips = [];
        this._trayIconManagerRefreshId = 0;

        /* This doesn't really work 100% because applets get reloaded and we end up losing this
         * list. Not that big a deal in practice*/
        this.ignoredProxies = {};

        this.signalManager = new SignalManager.SignalManager(null);
        this._scaleUpdateId = 0;

        this.monitor = new XApp.StatusIconMonitor();
        this.signalManager.connect(this.monitor, "icon-added", this.onMonitorIconAdded, this);
        this.signalManager.connect(this.monitor, "icon-removed", this.onMonitorIconRemoved, this);

        this.signalManager.connect(Gtk.IconTheme.get_default(), 'changed', this.on_icon_theme_changed, this);
        this.signalManager.connect(global.settings, 'changed::panel-edit-mode', this.on_panel_edit_mode_changed, this);

        this.signalManager.connect(Main.systrayManager, "changed", this.onSystrayRolesChanged, this);

        /* HACK - the built-in on_panel_icon_size_changed() call only sends if the type (symbolic, fullcolor)
         * of the icon size matches the last type used by the applet.  Since this applet can contain both
         * types, listen to the panel signal directly, so we always receive the update. */
        this.signalManager.connect(this.panel, "icon-size-changed", this.icon_size_changed, this);
        this.signalManager.connect(global, "scale-changed", this.ui_scale_changed, this);

        this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);
        this.settings.bind(
            "icon-scale",
            "iconScale",
            () => this.onIconScaleChanged()
        );
        this.settings.bind(
            "hidden-icons",
            "hiddenIcons",
            () => this.onHiddenIconsChanged()
        );
        this.settings.bind(
            "icon-order",
            "iconOrder",
            () => this.onIconOrderChanged()
        );
        this.settings.bind(
            "managed-icon-order",
            "managedIconOrder",
            () => this.onManagedIconOrderChanged()
        );

        this.rebuildHiddenIconRules();
        this.rebuildManagedIconOrderRules();
        this.rebuildIconOrderRules();

        this.buildTrayInfoMenuItem();
        this.buildTrayManagerMenuItem();
    }

    getScaledIconSize(baseSize) {
        let scale = Number(this.iconScale);

        if (!Number.isFinite(scale)) {
            scale = 100;
        }

        scale = Math.max(80, Math.min(120, scale));

        return Math.max(1, Math.round(baseSize * scale / 100));
    }

    onIconScaleChanged() {
        if (this.statusIcons) {
            for (let owner in this.statusIcons) {
                this.statusIcons[owner].refresh();
            }
        }
    }

    rebuildHiddenIconRules() {
        const prefixes = ["name", "icon", "tooltip", "label"];

        this.hiddenIconRules = String(this.hiddenIcons || "")
            .split("\n")
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"))
            .map(line => {
                const separatorIndex = line.indexOf(":");

                if (separatorIndex > 0) {
                    const prefix = line.slice(0, separatorIndex).trim().toLowerCase();

                    if (prefixes.indexOf(prefix) !== -1) {
                        return {
                            field: prefix,
                            value: line.slice(separatorIndex + 1).trim().toLowerCase()
                        };
                    }
                }

                return {
                    field: null,
                    value: line.toLowerCase()
                };
            })
            .filter(rule => rule.value);
    }

    getStatusIconMatchFields(iconProxy) {
        return {
            name: String(iconProxy.name || "").trim(),
            icon: String(iconProxy.icon_name || "").trim(),
            tooltip: String(iconProxy.tooltip_text || "").trim(),
            label: String(iconProxy.label || "").trim()
        };
    }

    isStatusIconHidden(iconProxy) {
        if (this.hiddenIconRules.length === 0) {
            return false;
        }

        const fields = this.getStatusIconMatchFields(iconProxy);
        const lowerFields = {};

        for (let field in fields) {
            lowerFields[field] = fields[field].toLowerCase();
        }

        for (let rule of this.hiddenIconRules) {
            if (rule.field) {
                if (lowerFields[rule.field].includes(rule.value)) {
                    return true;
                }
            }
            else {
                for (let field in lowerFields) {
                    if (lowerFields[field].includes(rule.value)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    onHiddenIconsChanged() {
        this.rebuildHiddenIconRules();

        if (!this.statusIcons) {
            return;
        }

        for (let key in this.statusIcons) {
            this.statusIcons[key].updateEffectiveVisibility();
        }

        this.scheduleTrayIconManagerRefresh();
    }

    rebuildIconOrderRules() {
        const prefixes = ["name", "icon", "tooltip", "label"];
        const seen = Object.create(null);
        const rules = [];
        const lines = String(this.iconOrder || "").split(/\r\n|\n|\r/);

        for (let line of lines) {
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }

            const separatorIndex = trimmed.indexOf(":");

            if (separatorIndex <= 0) {
                continue;
            }

            const field = trimmed.slice(0, separatorIndex).trim().toLowerCase();

            if (prefixes.indexOf(field) === -1) {
                continue;
            }

            const value = trimmed.slice(separatorIndex + 1).trim().toLowerCase();

            if (!value) {
                continue;
            }

            const key = `${field}:${value}`;

            if (seen[key]) {
                continue;
            }

            seen[key] = true;
            rules.push({
                field,
                value,
                priority: rules.length
            });
        }

        this.iconOrderRules = rules;
        this.rebuildEffectiveIconOrderRules();
    }

    normalizeIconOrderRuleLine(line) {
        const trimmed = String(line || "").trim();

        if (!trimmed || trimmed.startsWith("#")) {
            return null;
        }

        const separatorIndex = trimmed.indexOf(":");

        if (separatorIndex <= 0) {
            return null;
        }

        const field = trimmed.slice(0, separatorIndex).trim().toLowerCase();

        if (["name", "icon", "tooltip", "label"].indexOf(field) === -1) {
            return null;
        }

        const value = trimmed.slice(separatorIndex + 1).trim();

        if (!value || /[\r\n]/.test(value)) {
            return null;
        }

        return `${field}:${value.toLowerCase()}`;
    }

    rebuildManagedIconOrderRules() {
        const rules = [];
        const seen = Object.create(null);
        const entries = Array.isArray(this.managedIconOrder) ? this.managedIconOrder : [];

        for (let entry of entries) {
            const normalized = this.normalizeIconOrderRuleLine(entry);

            if (!normalized || seen[normalized]) {
                continue;
            }

            const separatorIndex = normalized.indexOf(":");
            const field = normalized.slice(0, separatorIndex);
            const value = normalized.slice(separatorIndex + 1);

            seen[normalized] = true;
            rules.push({
                field,
                value,
                rule: normalized,
                priority: rules.length,
                source: "managed"
            });
        }

        this.managedIconOrderRules = rules;
        this.rebuildEffectiveIconOrderRules();
    }

    rebuildEffectiveIconOrderRules() {
        const rules = [];
        const managedSeen = Object.create(null);

        for (let rule of this.managedIconOrderRules || []) {
            managedSeen[`${rule.field}:${rule.value}`] = true;
            rules.push({
                field: rule.field,
                value: rule.value,
                rule: `${rule.field}:${rule.value}`,
                priority: rules.length,
                source: "managed",
                sourcePriority: rule.priority
            });
        }

        for (let rule of this.iconOrderRules || []) {
            const key = `${rule.field}:${rule.value}`;

            if (managedSeen[key]) {
                continue;
            }

            rules.push({
                field: rule.field,
                value: rule.value,
                rule: key,
                priority: rules.length,
                source: "manual",
                sourcePriority: rule.priority
            });
        }

        this.effectiveIconOrderRules = rules;
    }

    onManagedIconOrderChanged() {
        this.rebuildManagedIconOrderRules();
        this.sortIcons();
        this.scheduleTrayIconManagerRefresh();
    }

    onIconOrderChanged() {
        this.rebuildIconOrderRules();
        this.sortIcons();
        this.scheduleTrayIconManagerRefresh();
    }

    getIconOrderMatch(statusIcon) {
        if (!this.effectiveIconOrderRules || this.effectiveIconOrderRules.length === 0) {
            return null;
        }

        const fields = this.getStatusIconMatchFields(statusIcon.proxy);
        const normalizedFields = {};

        for (let field in fields) {
            const value = String(fields[field] || "").trim();
            normalizedFields[field] = /[\r\n]/.test(value) ? null : value.toLowerCase();
        }

        for (let rule of this.effectiveIconOrderRules) {
            if (normalizedFields[rule.field] && normalizedFields[rule.field] === rule.value) {
                return rule;
            }
        }

        return null;
    }

    getIconOrderPriority(statusIcon) {
        const match = this.getIconOrderMatch(statusIcon);

        return match ? match.priority : null;
    }

    buildTrayInfoMenuItem() {
        this._trayInfoItem = new PopupMenu.PopupSubMenuMenuItem("Tray Icon Info");

        this._trayInfoConnectId = this._trayInfoItem.menu.connect(
            "open-state-changed",
            Lang.bind(this, (menu, open) => {
                if (open) {
                    this.rebuildTrayInfoMenu();
                }
            })
        );

        this._applet_context_menu.addMenuItem(this._trayInfoItem);
    }

    buildTrayManagerMenuItem() {
        this._trayManagerItem = new PopupMenu.PopupMenuItem("Manage Tray Icons...");
        this._trayManagerActivateId = this._trayManagerItem.connect(
            "activate",
            Lang.bind(this, () => this.openTrayIconManager())
        );

        this._applet_context_menu.addMenuItem(this._trayManagerItem);
    }

    rebuildTrayInfoMenu() {
        this._trayInfoItem.menu.removeAll();

        const iconEntries = [];

        for (let key in this.statusIcons) {
            iconEntries.push(this.statusIcons[key]);
        }

        iconEntries.sort(this._sortFunc);

        if (iconEntries.length === 0) {
            const emptyItem = new PopupMenu.PopupMenuItem("No tray icons", {
                reactive: false
            });
            this._trayInfoItem.menu.addMenuItem(emptyItem);
            return;
        }

        const copyAllItem = new PopupMenu.PopupMenuItem("Copy All Diagnostics");
        copyAllItem.connect("activate", Lang.bind(this, () => {
            this.copyTextToClipboard(this.formatAllDiagnostics(iconEntries));
        }));
        this._trayInfoItem.menu.addMenuItem(copyAllItem);
        this._trayInfoItem.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        for (let icon of iconEntries) {
            const fields = this.getStatusIconMatchFields(icon.proxy);
            const title = this.generateIconTitle(fields);
            const subMenu = new PopupMenu.PopupSubMenuMenuItem(title);

            const hidden = this.isStatusIconHidden(icon.proxy);
            const effective = Boolean(icon.applicationVisible) && !hidden;

            const fieldLines = [
                { label: "name", value: fields.name },
                { label: "icon", value: fields.icon },
                { label: "tooltip", value: fields.tooltip },
                { label: "label", value: fields.label },
                { label: "application-visible", value: icon.applicationVisible ? "true" : "false" },
                { label: "hidden-by-rule", value: hidden ? "true" : "false" },
                { label: "effective-visible", value: effective ? "true" : "false" }
            ];

            const recommendedRule = this.getRecommendedRule(icon.proxy);

            for (let fl of fieldLines) {
                const labelText = fl.value || "(empty)";
                const displayText = `${fl.label}: ${labelText.length > 60 ? labelText.slice(0, 57) + "..." : labelText}`;
                const fi = new PopupMenu.PopupMenuItem(displayText, {
                    reactive: false
                });
                subMenu.menu.addMenuItem(fi);
            }

            const ruleText = recommendedRule || "unavailable";
            const ruleDisplay = recommendedRule
                ? `Recommended rule: ${ruleText}`
                : "Recommended rule: unavailable";
            const ruleItem = new PopupMenu.PopupMenuItem(ruleDisplay, {
                reactive: false
            });
            subMenu.menu.addMenuItem(ruleItem);
            subMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            if (recommendedRule) {
                if (this.isHiddenIconRuleAdded(recommendedRule)) {
                    const removeItem = new PopupMenu.PopupMenuItem("Remove Exact Hide Rule");
                    removeItem.connect("activate", Lang.bind(this, () => {
                        this.removeHiddenIconRule(recommendedRule);
                    }));
                    subMenu.menu.addMenuItem(removeItem);
                } else {
                    const addRuleItem = new PopupMenu.PopupMenuItem("Add Recommended Hide Rule");
                    addRuleItem.connect("activate", Lang.bind(this, () => {
                        this.addHiddenIconRule(recommendedRule);
                    }));
                    subMenu.menu.addMenuItem(addRuleItem);
                }
            }

            if (recommendedRule) {
                const copyRuleItem = new PopupMenu.PopupMenuItem("Copy Recommended Rule");
                copyRuleItem.connect("activate", Lang.bind(this, () => {
                    this.copyTextToClipboard(recommendedRule);
                }));
                subMenu.menu.addMenuItem(copyRuleItem);
            }
            else {
                const copyRuleItem = new PopupMenu.PopupMenuItem("Copy Recommended Rule", {
                    reactive: false
                });
                subMenu.menu.addMenuItem(copyRuleItem);
            }

            const copyDiagItem = new PopupMenu.PopupMenuItem("Copy Icon Diagnostics");
            copyDiagItem.connect("activate", Lang.bind(this, () => {
                this.copyTextToClipboard(this.formatIconDiagnostics(icon));
            }));
            subMenu.menu.addMenuItem(copyDiagItem);

            this._trayInfoItem.menu.addMenuItem(subMenu);
        }
    }

    generateIconTitle(fields) {
        const cleanName = fields.name.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
        if (cleanName && !/^:\d+\.\d+$/.test(cleanName)) {
            return cleanName;
        }

        const tooltipLine = fields.tooltip.split("\n")[0].trim().replace(/\s+/g, " ");
        if (tooltipLine && tooltipLine.length >= 3) {
            return tooltipLine;
        }

        if (fields.icon && fields.icon.length >= 3) {
            return fields.icon;
        }

        const cleanLabel = fields.label.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
        if (cleanLabel && cleanLabel.length >= 3) {
            return cleanLabel;
        }

        return "Unnamed tray icon";
    }

    getRecommendedRule(iconProxy) {
        const fields = this.getStatusIconMatchFields(iconProxy);
        const name = fields.name;
        const icon = fields.icon;
        const tooltip = fields.tooltip;
        const label = fields.label;

        const nameIsMultiline = /[\r\n]/.test(name);
        if (name && !nameIsMultiline && !/^:\d+\.\d+$/.test(name) && name.length >= 3) {
            return `name:${name}`;
        }

        if (icon &&
            icon.length >= 3 &&
            !icon.includes("xapp-tmp-") &&
            !icon.startsWith("/dev/shm/") &&
            !icon.startsWith("/tmp/")) {
            return `icon:${icon}`;
        }

        const tooltipLine = tooltip.split("\n")[0].trim().replace(/\s+/g, " ");
        if (tooltipLine && tooltipLine.length >= 3 && !/^\d+$/.test(tooltipLine)) {
            return `tooltip:${tooltipLine}`;
        }

        const cleanLabel = label.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
        if (cleanLabel && cleanLabel.length >= 3) {
            return `label:${cleanLabel}`;
        }

        return null;
    }

    getStableIconRule(iconProxy) {
        const fields = this.getStatusIconMatchFields(iconProxy);
        const name = fields.name;
        const icon = fields.icon;
        const tooltip = fields.tooltip;
        const label = fields.label;

        if (name && name.length >= 3 && !/[\r\n]/.test(name) && !/^:\d+\.\d+$/.test(name)) {
            return `name:${name}`;
        }

        if (icon &&
            icon.length >= 3 &&
            icon.indexOf("xapp-tmp-") === -1 &&
            icon.indexOf("/tmp/") === -1 &&
            icon.indexOf("/dev/shm/") === -1) {
            return `icon:${icon}`;
        }

        if (tooltip && !/[\r\n]/.test(tooltip)) {
            return `tooltip:${tooltip}`;
        }

        if (label && !/[\r\n]/.test(label)) {
            return `label:${label}`;
        }

        return null;
    }

    getHiddenIconRuleMatch(iconProxy) {
        if (this.hiddenIconRules.length === 0) {
            return null;
        }

        const fields = this.getStatusIconMatchFields(iconProxy);
        const lowerFields = {};

        for (let field in fields) {
            lowerFields[field] = fields[field].toLowerCase();
        }

        for (let rule of this.hiddenIconRules) {
            if (rule.field) {
                if (lowerFields[rule.field].includes(rule.value)) {
                    return rule;
                }
            }
            else {
                for (let field in lowerFields) {
                    if (lowerFields[field].includes(rule.value)) {
                        return rule;
                    }
                }
            }
        }

        return null;
    }

    copyTextToClipboard(text) {
        St.Clipboard.get_default().set_text(
            St.ClipboardType.CLIPBOARD,
            text
        );
    }

    normalizeHiddenIconRuleLine(line) {
        const trimmed = String(line || "").trim();

        if (!trimmed || trimmed.startsWith("#")) {
            return null;
        }

        return trimmed.toLowerCase();
    }

    _parseTextLines(text) {
        const lines = [];
        let start = 0;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];

            if (ch === "\r") {
                if (i + 1 < text.length && text[i + 1] === "\n") {
                    lines.push({ content: text.slice(start, i), ending: "\r\n" });
                    start = i + 2;
                    i++;
                } else {
                    lines.push({ content: text.slice(start, i), ending: "\r" });
                    start = i + 1;
                }
            } else if (ch === "\n") {
                lines.push({ content: text.slice(start, i), ending: "\n" });
                start = i + 1;
            }
        }

        if (start < text.length) {
            lines.push({ content: text.slice(start), ending: "" });
        }

        return lines;
    }

    isHiddenIconRuleAdded(rule) {
        if (!rule) {
            return false;
        }

        const normRule = this.normalizeHiddenIconRuleLine(rule);
        if (!normRule) {
            return false;
        }

        const rawText = String(this.hiddenIcons || "");
        const lines = rawText.split("\n");

        return lines.some(line => {
            const norm = this.normalizeHiddenIconRuleLine(line);
            return norm && norm === normRule;
        });
    }

    removeHiddenIconRule(rule) {
        if (!rule) {
            return false;
        }

        const normRule = this.normalizeHiddenIconRuleLine(rule);
        if (!normRule) {
            return false;
        }

        const rawText = String(this.hiddenIcons || "");
        if (!rawText) {
            return false;
        }

        const originalLastHadNoEnding = rawText.length > 0 &&
            !/[\r\n]$/.test(rawText);
        const parsed = this._parseTextLines(rawText);
        const remaining = [];
        let removed = false;

        for (let line of parsed) {
            const norm = this.normalizeHiddenIconRuleLine(line.content);
            if (norm && norm === normRule) {
                removed = true;
            } else {
                remaining.push(line);
            }
        }

        if (!removed) {
            return false;
        }

        if (originalLastHadNoEnding && remaining.length > 0) {
            remaining[remaining.length - 1].ending = "";
        }

        const newText = remaining.map(l => l.content + l.ending).join("");

        this.hiddenIcons = newText;
        this.onHiddenIconsChanged();

        return true;
    }

    addHiddenIconRule(rule) {
        if (!rule) {
            return false;
        }

        if (this.isHiddenIconRuleAdded(rule)) {
            return false;
        }

        const rawText = String(this.hiddenIcons || "");

        let newText;
        if (!rawText) {
            newText = rule;
        } else if (rawText.endsWith("\n")) {
            newText = rawText + rule;
        } else {
            newText = rawText + "\n" + rule;
        }

        this.hiddenIcons = newText;
        this.onHiddenIconsChanged();

        return true;
    }

    formatIconDiagnostics(icon) {
        const fields = this.getStatusIconMatchFields(icon.proxy);
        const hidden = this.isStatusIconHidden(icon.proxy);
        const effective = Boolean(icon.applicationVisible) && !hidden;
        const recommendedRule = this.getRecommendedRule(icon.proxy);

        const lines = [];
        lines.push(`name: ${fields.name || "(empty)"}`);
        lines.push(`icon: ${fields.icon || "(empty)"}`);
        lines.push(`tooltip: ${fields.tooltip || "(empty)"}`);
        lines.push(`label: ${fields.label || "(empty)"}`);
        lines.push(`application-visible: ${icon.applicationVisible ? "true" : "false"}`);
        lines.push(`hidden-by-rule: ${hidden ? "true" : "false"}`);
        lines.push(`effective-visible: ${effective ? "true" : "false"}`);
        lines.push(`recommended-rule: ${recommendedRule || "unavailable"}`);

        return lines.join("\n");
    }

    formatAllDiagnostics(iconEntries) {
        const lines = [];
        lines.push("Fayoo XApp Status Applet - Tray Icon Diagnostics\n");

        let index = 1;
        for (let entry of iconEntries) {
            const fields = this.getStatusIconMatchFields(entry.proxy);

            const title = this.generateIconTitle(fields);
            lines.push(`[${index}] ${title}\n`);

            lines.push(this.formatIconDiagnostics(entry));
            lines.push("");
            index++;
        }

        return lines.join("\n");
    }

    getTrayIconManagerEntries() {
        const entries = [];
        const activeOrderRules = Object.create(null);

        for (let key in this.statusIcons) {
            const icon = this.statusIcons[key];
            const fields = this.getStatusIconMatchFields(icon.proxy);
            const orderRule = this.getStableIconRule(icon.proxy);
            const hideRule = this.getRecommendedRule(icon.proxy);
            const normalizedOrderRule = this.normalizeIconOrderRuleLine(orderRule);
            const hiddenByAnyRule = this.isStatusIconHidden(icon.proxy);
            const exactRulePresent = Boolean(hideRule) && this.isHiddenIconRuleAdded(hideRule);
            const orderMatch = this.getIconOrderMatch(icon);
            let managedPriority = null;
            let manualPriority = null;

            if (orderMatch) {
                if (orderMatch.source === "managed" && normalizedOrderRule === orderMatch.rule) {
                    managedPriority = orderMatch.sourcePriority;
                } else if (orderMatch.source === "manual") {
                    manualPriority = orderMatch.sourcePriority;
                }
            }

            if (normalizedOrderRule) {
                activeOrderRules[normalizedOrderRule] = true;
            }

            entries.push({
                icon,
                key,
                title: this.generateIconTitle(fields),
                iconName: fields.icon,
                orderRule,
                hideRule,
                applicationVisible: Boolean(icon.applicationVisible),
                hiddenByAnyRule,
                exactRulePresent,
                hiddenByOtherRule: hiddenByAnyRule && !exactRulePresent,
                effectiveVisible: Boolean(icon.applicationVisible) && !hiddenByAnyRule,
                managedPriority,
                manualPriority,
                unavailable: false
            });
        }

        const managedEntries = entries
            .filter(entry => entry.managedPriority !== null)
            .sort((a, b) => a.managedPriority - b.managedPriority || this._sortFunc(a.icon, b.icon));

        const otherEntries = entries
            .filter(entry => entry.managedPriority === null)
            .sort((a, b) => {
                if (a.manualPriority !== null && b.manualPriority === null) {
                    return -1;
                }

                if (b.manualPriority !== null && a.manualPriority === null) {
                    return 1;
                }

                if (a.manualPriority !== null && b.manualPriority !== null && a.manualPriority !== b.manualPriority) {
                    return a.manualPriority - b.manualPriority;
                }

                return this._sortFunc(a.icon, b.icon);
            });

        const unavailableEntries = [];

        for (let rule of this.managedIconOrderRules || []) {
            const normalized = `${rule.field}:${rule.value}`;

            if (activeOrderRules[normalized]) {
                continue;
            }

            unavailableEntries.push({
                title: rule.rule,
                iconName: "",
                orderRule: rule.rule,
                hideRule: null,
                applicationVisible: false,
                hiddenByAnyRule: false,
                exactRulePresent: false,
                hiddenByOtherRule: false,
                effectiveVisible: false,
                managedPriority: rule.priority,
                manualPriority: null,
                unavailable: true
            });
        }

        return {
            managedEntries,
            otherEntries,
            unavailableEntries
        };
    }

    openTrayIconManager() {
        if (this._trayIconManagerDialog) {
            this.rebuildTrayIconManagerDialog();
            this._trayIconManagerDialog.open(global.get_current_time());
            return;
        }

        const dialog = new ModalDialog.ModalDialog({
            styleClass: "fayoo-xapp-status-manager-dialog",
            destroyOnClose: false
        });
        this._trayIconManagerDialog = dialog;

        const title = new St.Label({
            style_class: "fayoo-xapp-status-manager-title",
            text: "Tray Icon Manager"
        });
        dialog.contentLayout.add_actor(title);

        const description = new St.Label({
            style_class: "fayoo-xapp-status-manager-description",
            text: "Hide or show active tray icons. Ordering is displayed here and will be editable in a later version."
        });
        description.clutter_text.line_wrap = true;
        dialog.contentLayout.add_actor(description);

        const scrollView = new St.ScrollView({
            style_class: "fayoo-xapp-status-manager-scrollview",
            x_fill: true,
            y_fill: true
        });
        this._trayIconManagerContent = new St.BoxLayout({
            vertical: true,
            style_class: "fayoo-xapp-status-manager-content"
        });
        scrollView.add_actor(this._trayIconManagerContent);
        dialog.contentLayout.add_actor(scrollView);

        dialog.setButtons([
            {
                label: "Close",
                action: () => dialog.close(global.get_current_time()),
                key: Clutter.KEY_Escape
            }
        ]);

        this._trayIconManagerClosedId = dialog.connect("closed", Lang.bind(this, () => {
            this.cancelTrayIconManagerRefresh();
        }));
        this._trayIconManagerDestroyId = dialog.connect("destroy", Lang.bind(this, () => {
            this.cancelTrayIconManagerRefresh();
            this.destroyTrayIconManagerTooltips();
            this._trayIconManagerDialog = null;
            this._trayIconManagerContent = null;
            this._trayIconManagerClosedId = 0;
            this._trayIconManagerDestroyId = 0;
        }));

        this.rebuildTrayIconManagerDialog();
        dialog.open(global.get_current_time());
    }

    destroyTrayIconManagerTooltips() {
        for (let tooltip of this._trayIconManagerTooltips || []) {
            tooltip.destroy();
        }

        this._trayIconManagerTooltips = [];
    }

    rebuildTrayIconManagerDialog() {
        if (!this._trayIconManagerContent) {
            return;
        }

        this.destroyTrayIconManagerTooltips();
        this._trayIconManagerContent.destroy_all_children();

        const groups = this.getTrayIconManagerEntries();
        this.addTrayIconManagerSection("Managed order", groups.managedEntries, "No managed entries yet.");
        this.addTrayIconManagerSection("Other active icons", groups.otherEntries, "No active tray icons.");
        this.addTrayIconManagerSection("Unavailable managed entries", groups.unavailableEntries, "All managed entries are currently active.");
    }

    addTrayIconManagerSection(title, entries, emptyText) {
        const section = new St.BoxLayout({
            vertical: true,
            style_class: "fayoo-xapp-status-manager-section"
        });
        const header = new St.Label({
            style_class: "fayoo-xapp-status-manager-section-title",
            text: title
        });
        section.add_actor(header);

        if (entries.length === 0) {
            section.add_actor(new St.Label({
                style_class: "fayoo-xapp-status-manager-empty",
                text: emptyText
            }));
        } else {
            for (let entry of entries) {
                section.add_actor(this.createTrayIconManagerRow(entry));
            }
        }

        this._trayIconManagerContent.add_actor(section);
    }

    createTrayIconManagerRow(entry) {
        const row = new St.BoxLayout({
            vertical: false,
            style_class: entry.unavailable
                ? "fayoo-xapp-status-manager-row fayoo-xapp-status-manager-row-unavailable"
                : "fayoo-xapp-status-manager-row"
        });

        row.add_actor(this.createTrayIconManagerEyeButton(entry));

        const iconName = entry.iconName && entry.iconName.indexOf("/") === -1 ? entry.iconName : "image-missing";
        row.add_actor(new St.Icon({
            icon_name: iconName,
            icon_type: St.IconType.FULLCOLOR,
            icon_size: 22,
            style_class: "fayoo-xapp-status-manager-row-icon"
        }));

        const textBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: "fayoo-xapp-status-manager-row-text"
        });

        const title = new St.Label({
            style_class: "fayoo-xapp-status-manager-row-title",
            text: entry.title
        });
        title.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        textBox.add_actor(title);

        const detailParts = [];
        if (entry.unavailable) {
            detailParts.push("Not currently active");
        } else {
            detailParts.push(entry.effectiveVisible ? "Visible" : "Hidden");
            if (!entry.applicationVisible) {
                detailParts.push("App disabled visibility");
            }
            if (entry.hiddenByOtherRule) {
                detailParts.push("Hidden by another rule");
            }
        }

        if (entry.orderRule) {
            detailParts.push(`Order rule: ${entry.orderRule}`);
        } else {
            detailParts.push("Order rule: No stable order identifier");
        }

        if (!entry.unavailable) {
            if (entry.hideRule) {
                detailParts.push(`Hide rule: ${entry.hideRule}`);
            } else {
                detailParts.push("Hide rule: No safe hide rule");
            }
        }

        const detail = new St.Label({
            style_class: "fayoo-xapp-status-manager-row-detail",
            text: detailParts.join(" - ")
        });
        detail.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        textBox.add_actor(detail);
        row.add_actor(textBox);

        return row;
    }

    createTrayIconManagerEyeButton(entry) {
        let label = entry.effectiveVisible ? "Hide" : "Show";
        let tooltipText = entry.effectiveVisible ? "Hide this tray icon" : "Show this tray icon";
        let disabled = false;
        let action = null;

        if (entry.unavailable) {
            label = "-";
            tooltipText = "Not currently active";
            disabled = true;
        } else if (!entry.hideRule) {
            label = "-";
            tooltipText = "No safe hide rule";
            disabled = true;
        } else if (entry.exactRulePresent) {
            label = "Show";
            tooltipText = "Remove exact hide rule";
            action = () => this.removeHiddenIconRule(entry.hideRule);
        } else if (entry.hiddenByOtherRule) {
            label = "-";
            tooltipText = "Hidden by another rule";
            disabled = true;
        } else {
            label = "Hide";
            tooltipText = "Add exact hide rule";
            action = () => this.addHiddenIconRule(entry.hideRule);
        }

        const button = new St.Button({
            label,
            reactive: true,
            can_focus: !disabled,
            track_hover: true,
            style_class: disabled
                ? "fayoo-xapp-status-manager-eye-button fayoo-xapp-status-manager-eye-button-disabled"
                : "fayoo-xapp-status-manager-eye-button"
        });

        if (action) {
            button.connect("clicked", Lang.bind(this, () => {
                if (action()) {
                    this.rebuildTrayIconManagerDialog();
                }
            }));
        }

        const tooltip = new Tooltips.Tooltip(button, tooltipText);
        this._trayIconManagerTooltips.push(tooltip);

        return button;
    }

    scheduleTrayIconManagerRefresh() {
        if (!this._trayIconManagerDialog || !this._trayIconManagerContent) {
            return;
        }

        if (this._trayIconManagerDialog.state !== ModalDialog.State.OPENED &&
            this._trayIconManagerDialog.state !== ModalDialog.State.OPENING) {
            return;
        }

        if (this._trayIconManagerRefreshId > 0) {
            return;
        }

        this._trayIconManagerRefreshId = Mainloop.idle_add(() => {
            this._trayIconManagerRefreshId = 0;
            this.rebuildTrayIconManagerDialog();

            return GLib.SOURCE_REMOVE;
        });
    }

    cancelTrayIconManagerRefresh() {
        if (this._trayIconManagerRefreshId > 0) {
            Mainloop.source_remove(this._trayIconManagerRefreshId);
            this._trayIconManagerRefreshId = 0;
        }
    }

    setContainerOrientationClass(orientation) {
        this.manager_container.remove_style_class_name(HORIZONTAL_STYLE_CLASS);
        this.manager_container.remove_style_class_name(VERTICAL_STYLE_CLASS);

        if (orientation == St.Side.TOP || orientation == St.Side.BOTTOM) {
            this.manager_container.add_style_class_name(HORIZONTAL_STYLE_CLASS);
        } else {
            this.manager_container.add_style_class_name(VERTICAL_STYLE_CLASS);
        }
    }

    getKey(icon_proxy) {
        let proxy_name = icon_proxy.get_name();
        let proxy_path = icon_proxy.get_object_path()

        return proxy_name + proxy_path;
    }

    onMonitorIconAdded(monitor, icon_proxy) {
        let key = this.getKey(icon_proxy);

        if (this.statusIcons[key]) {
            return;
        }

        if (this.shouldIgnoreStatusIcon(icon_proxy)) {
            global.log(`Hiding XAppStatusIcon (we have an applet): ${icon_proxy.name}`);
            this.ignoreStatusIcon(icon_proxy);

            return;
        }

        global.log(`Adding XAppStatusIcon: ${icon_proxy.name} (${key})`);
        this.addStatusIcon(icon_proxy);
    }

    onMonitorIconRemoved(monitor, icon_proxy) {
        let key = this.getKey(icon_proxy);

        if (!this.statusIcons[key]) {
            if (this.ignoredProxies[key]) {
                delete this.ignoredProxies[key];
            }

            return;
        }

        global.log(`Removing XAppStatusIcon: ${icon_proxy.name} (${key})`);
        this.removeStatusIcon(icon_proxy);
    }

    onSystrayRolesChanged() {
        let hiddenIcons = Main.systrayManager.getRoles();

        for (let i in this.statusIcons) {
            let icon_proxy = this.statusIcons[i].proxy;

            if (this.shouldIgnoreStatusIcon(icon_proxy)) {
                global.log(`Hiding XAppStatusIcon (we have an applet): ${icon_proxy.name} (${i})`);
                this.removeStatusIcon(icon_proxy);
                this.ignoreStatusIcon(icon_proxy);
            }
        }

        for (let i in this.ignoredProxies) {
            let icon_proxy = this.ignoredProxies[i];

            if (!this.shouldIgnoreStatusIcon(icon_proxy)) {
                delete this.ignoredProxies[i];

                global.log(`Restoring hidden XAppStatusIcon (native applet gone): ${icon_proxy.name} (${i})`);
                this.addStatusIcon(icon_proxy);
            }
        }
    }

    addStatusIcon(icon_proxy) {
        let key = this.getKey(icon_proxy);
        let statusIcon = new XAppStatusIcon(this, icon_proxy);

        this.manager_container.insert_child_at_index(statusIcon.actor, 0);
        this.statusIcons[key] = statusIcon;

        this.sortIcons();
        this.scheduleTrayIconManagerRefresh();
    }

    removeStatusIcon(icon_proxy) {
        let key = this.getKey(icon_proxy);

        if (!this.statusIcons[key]) {
            return;
        }

        this.manager_container.remove_child(this.statusIcons[key].actor);
        this.statusIcons[key].destroy();
        delete this.statusIcons[key];

        this.sortIcons();
        this.scheduleTrayIconManagerRefresh();
    }

    ignoreStatusIcon(icon_proxy) {
        let key = this.getKey(icon_proxy);

        if (this.ignoredProxies[key]) {
            return;
        }

        this.ignoredProxies[key] = icon_proxy;
    }

    shouldIgnoreStatusIcon(icon_proxy) {
        let hiddenIcons = Main.systrayManager.getRoles();

        let name = icon_proxy.name.toLowerCase();

        if (hiddenIcons.indexOf(name) != -1 ) {
            return true;
        }

        return false;
    }

    _sortFunc(a, b) {
        let asym = a.proxy.icon_name.includes("-symbolic");
        let bsym = b.proxy.icon_name.includes("-symbolic");

        if (asym && !bsym) {
            return 1;
        }

        if (bsym && !asym) {
            return -1;
        }

        return GLib.utf8_collate(a.proxy.name.replace("org.x.StatusIcon.", "").toLowerCase(),
                                 b.proxy.name.replace("org.x.StatusIcon.", "").toLowerCase());
    }

    sortIcons() {
        this.onSystrayRolesChanged();

        let icon_list = [];
        let insertionIndexByKey = Object.create(null);

        for (let i in this.statusIcons) {
            insertionIndexByKey[i] = icon_list.length;
            icon_list.push(this.statusIcons[i]);
        }

        let defaultSorted = icon_list.slice();
        defaultSorted.sort(this._sortFunc);

        let defaultIndexByKey = Object.create(null);
        for (let i = 0; i < defaultSorted.length; i++) {
            defaultIndexByKey[this.getKey(defaultSorted[i].proxy)] = i;
        }

        icon_list.sort((a, b) => {
            const aPriority = this.getIconOrderPriority(a);
            const bPriority = this.getIconOrderPriority(b);
            const aMatched = aPriority !== null;
            const bMatched = bPriority !== null;

            if (aMatched && !bMatched) {
                return -1;
            }

            if (bMatched && !aMatched) {
                return 1;
            }

            if (aMatched && bMatched && aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            const aKey = this.getKey(a.proxy);
            const bKey = this.getKey(b.proxy);
            const defaultCompare = defaultIndexByKey[aKey] - defaultIndexByKey[bKey];

            if (defaultCompare !== 0) {
                return defaultCompare;
            }

            return insertionIndexByKey[aKey] - insertionIndexByKey[bKey];
        });

        icon_list.reverse();

        for (let icon of icon_list) {
            this.manager_container.set_child_at_index(icon.actor, 0);
        }

        this.manager_container.set_child_at_index(this._recording_indicator.actor, -1);
    }

    refreshIcons() {
        for (let owner in this.statusIcons) {
            let icon = this.statusIcons[owner];
            icon.refresh();
        }

        this._recording_indicator.refresh();
    }

    icon_size_changed() {
        this.refreshIcons();
    }

    on_icon_theme_changed() {
        this.refreshIcons();
    }

    ui_scale_changed() {
        if (this._scaleUpdateId > 0) {
            Mainloop.source_remove(this._scaleUpdateId);
        }

        this._scaleUpdateId = Mainloop.timeout_add(1500, () => {
            this.refreshIcons();

            this._scaleUpdateId = 0;
            return GLib.SOURCE_REMOVE;
        })
    }

    on_applet_removed_from_panel() {
        if (this._trayIconManagerDialog) {
            this.cancelTrayIconManagerRefresh();
            this.destroyTrayIconManagerTooltips();
            this._trayIconManagerDialog.destroy();
            this._trayIconManagerDialog = null;
            this._trayIconManagerContent = null;
        }

        if (this._trayManagerItem) {
            if (this._trayManagerActivateId) {
                this._trayManagerItem.disconnect(this._trayManagerActivateId);
                this._trayManagerActivateId = 0;
            }
            this._trayManagerItem.destroy();
            this._trayManagerItem = null;
        }

        if (this._trayInfoItem && this._trayInfoConnectId) {
            this._trayInfoItem.menu.disconnect(this._trayInfoConnectId);
            this._trayInfoConnectId = 0;
            this._trayInfoItem.destroy();
            this._trayInfoItem = null;
        }

        if (this.settings) {
            this.settings.finalize();
            this.settings = null;
        }

        this.signalManager.disconnectAllSignals();

        for (let key in this.statusIcons) {
            this.statusIcons[key].destroy();
            delete this.statusIcons[key];
        };

        for (let key in this.ignoredProxies) {
            delete this.ignoredProxies[key];
        };

        this._recording_indicator.destroy();
        this._recording_indicator = null;

        this.monitor = null;
    }

    on_panel_edit_mode_changed() {
        let reactive = !global.settings.get_boolean('panel-edit-mode');
        for (let owner in this.statusIcons) {
            let icon = this.statusIcons[owner];
            icon.actor.reactive = reactive;
        }
    }

    on_orientation_changed(newOrientation) {
        this.orientation = newOrientation;

        if (newOrientation == St.Side.TOP || newOrientation == St.Side.BOTTOM) {
            this.manager_container.vertical = false;
            this.manager_container.style = HORIZONTAL_STYLE;
        } else {
            this.manager_container.vertical = true;
            this.manager_container.style = VERTICAL_STYLE;
        }

        this.setContainerOrientationClass(newOrientation);

        this.refreshIcons();
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new CinnamonXAppStatusApplet(
        metadata,
        orientation,
        panel_height,
        instance_id
    );
}
