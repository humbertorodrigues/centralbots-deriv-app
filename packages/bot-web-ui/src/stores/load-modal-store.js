import { observable, action, computed, reaction, makeObservable } from 'mobx';
import { localize } from '@deriv/translations';
import { load, config, save_types, getSavedWorkspaces, removeExistingWorkspace } from '@deriv/bot-skeleton';
import { tabs_title } from 'Constants/load-modal';

export default class LoadModalStore {
    constructor(root_store) {
        makeObservable(this, {
            active_index: observable,
            is_load_modal_open: observable,
            is_explanation_expand: observable,
            is_open_button_loading: observable,
            loaded_local_file: observable,
            recent_strategies: observable,
            selected_strategy_id: observable,
            preview_workspace: computed,
            selected_strategy: computed,
            tab_name: computed,
            handleFileChange: action.bound,
            loadFileFromRecent: action.bound,
            loadFileFromLocal: action.bound,
            onActiveIndexChange: action.bound,
            onDriveConnect: action.bound,
            onDriveOpen: action.bound,
            onEntered: action.bound,
            onLoadModalClose: action.bound,
            onZoomInOutClick: action.bound,
            previewRecentStrategy: action.bound,
            setActiveTabIndex: action.bound,
            setLoadedLocalFile: action.bound,
            setRecentStrategies: action.bound,
            setSelectedStrategyId: action.bound,
            toggleExplanationExpand: action.bound,
            toggleLoadModal: action.bound,
        });

        this.root_store = root_store;

        reaction(
            () => this.active_index,
            () => this.onActiveIndexChange()
        );
        reaction(
            () => this.is_load_modal_open,
            async is_load_modal_open => {
                if (is_load_modal_open) {
                    this.setRecentStrategies((await getSavedWorkspaces()) || []);
                } else {
                    this.onLoadModalClose();
                }
            }
        );
    }

    recent_workspace;
    local_workspace;
    drop_zone;

    active_index = 0;
    is_load_modal_open = false;
    is_explanation_expand = false;
    is_open_button_loading = false;
    loaded_local_file = null;
    recent_strategies = [];
    selected_strategy_id = undefined;

    get preview_workspace() {
        if (this.tab_name === tabs_title.TAB_LOCAL) return this.local_workspace;
        if (this.tab_name === tabs_title.TAB_RECENT) return this.recent_workspace;
        return null;
    }

    get selected_strategy() {
        if (this.recent_strategies.length > 0) {
            return this.recent_strategies.find(ws => ws.id === this.selected_strategy_id) || this.recent_strategies[0];
        }

        return null;
    }

    get tab_name() {
        if (this.root_store.ui.is_mobile) {
            if (this.active_index === 0) return tabs_title.TAB_LOCAL;
            if (this.active_index === 1) return tabs_title.TAB_GOOGLE;
        }
        if (this.active_index === 0) return tabs_title.TAB_RECENT;
        if (this.active_index === 1) return tabs_title.TAB_LOCAL;
        if (this.active_index === 2) return tabs_title.TAB_GOOGLE;
        return '';
    }

    handleFileChange(event, is_body = true) {
        let files;
        if (event.type === 'drop') {
            event.stopPropagation();
            event.preventDefault();

            ({ files } = event.dataTransfer);
        } else {
            ({ files } = event.target);
        }

        files = Array.from(files);

        if (!is_body) {
            if (files[0].name.includes('xml')) {
                this.setLoadedLocalFile(files[0]);
            } else {
                return false;
            }
        }
        this.readFile(!is_body, event, files[0]);
        event.target.value = '';
        return true;
    }

    loadFileFromRecent() {
        this.is_open_button_loading = true;

        if (!this.selected_strategy) {
            this.is_open_button_loading = false;
            return;
        }

        removeExistingWorkspace(this.selected_strategy.id);
        load({
            block_string: this.selected_strategy.xml,
            strategy_id: this.selected_strategy.id,
            file_name: this.selected_strategy.name,
            workspace: Blockly.derivWorkspace,
        });
        this.is_open_button_loading = false;
        this.toggleLoadModal();
    }

    loadFileFromLocal() {
        this.is_open_button_loading = true;
        this.readFile(false, {}, this.loaded_local_file);
        this.is_open_button_loading = false;
        this.toggleLoadModal();
    }

    onActiveIndexChange() {
        if (this.tab_name === tabs_title.TAB_RECENT) {
            if (this.selected_strategy) {
                this.previewRecentStrategy(this.selected_strategy_id);
            }
        } else {
            // eslint-disable-next-line no-lonely-if
            if (this.recent_workspace) {
                setTimeout(() => {
                    // Dispose of recent workspace when switching away from Recent tab.
                    // Process in next cycle so user doesn't have to wait.
                    this.recent_workspace.dispose();
                    this.recent_workspace = null;
                });
            }
        }

        if (this.tab_name === tabs_title.TAB_LOCAL) {
            if (!this.drop_zone) {
                this.drop_zone = document.querySelector('load-strategy__local-dropzone-area');

                if (this.drop_zone) {
                    this.drop_zone.addEventListener('drop', event => this.handleFileChange(event, false));
                }
            }
        } else {
            // Dispose of local workspace when switching away from Local tab.
            // eslint-disable-next-line no-lonely-if
            if (this.local_workspace) {
                setTimeout(() => {
                    this.local_workspace.dispose();
                    this.local_workspace = null;
                    this.setLoadedLocalFile(null);
                });
            }
        }

        // Forget about drop zone when not on Local tab.
        if (this.tab_name !== tabs_title.TAB_LOCAL && this.drop_zone) {
            this.drop_zone.removeEventListener('drop', event => this.handleFileChange(event, false));
        }
    }

    async onDriveConnect() {
        const { google_drive } = this.root_store;

        if (google_drive.is_authorised) {
            google_drive.signOut();
        } else {
            google_drive.signIn();
        }
    }

    async onDriveOpen() {
        const { loadFile } = this.root_store.google_drive;
        const { xml_doc, file_name } = await loadFile();
        load({ block_string: xml_doc, file_name, workspace: Blockly.derivWorkspace, from: save_types.GOOGLE_DRIVE });
        this.toggleLoadModal();
    }

    onEntered() {
        if (this.tab_name === tabs_title.TAB_RECENT && this.selected_strategy) {
            this.previewRecentStrategy(this.selected_strategy.id);
        }
    }

    onLoadModalClose() {
        if (this.recent_workspace) {
            this.recent_workspace.dispose();
            this.recent_workspace = null;
        }
        if (this.local_workspace) {
            this.local_workspace.dispose();
            this.local_workspace = null;
        }

        this.setActiveTabIndex(0); // Reset to first tab.
        this.setLoadedLocalFile(null);
    }

    onZoomInOutClick(is_zoom_in) {
        if (this.preview_workspace) {
            this.preview_workspace.zoomCenter(is_zoom_in ? 1 : -1);
        }
    }

    previewRecentStrategy(workspace_id) {
        this.setSelectedStrategyId(workspace_id);

        if (!this.selected_strategy) {
            return;
        }

        if (!this.recent_workspace || !this.recent_workspace.rendered) {
            const ref = document.getElementById('load-strategy__blockly-container');

            if (!ref) {
                // eslint-disable-next-line no-console
                console.warn('Could not find preview workspace element.');
                return;
            }

            this.recent_workspace = Blockly.inject(ref, {
                media: `${__webpack_public_path__}media/`,
                zoom: {
                    wheel: true,
                    startScale: config.workspaces.previewWorkspaceStartScale,
                },
                readOnly: true,
                scrollbars: true,
            });
        }

        load({ block_string: this.selected_strategy.xml, drop_event: {}, workspace: this.recent_workspace });
    }

    setActiveTabIndex(index) {
        this.active_index = index;
    }

    setLoadedLocalFile(loaded_local_file) {
        this.loaded_local_file = loaded_local_file;
    }

    setRecentStrategies(recent_strategies) {
        this.recent_strategies = recent_strategies;
    }

    setSelectedStrategyId(selected_strategy_id) {
        this.selected_strategy_id = selected_strategy_id;
    }

    toggleExplanationExpand() {
        this.is_explanation_expand = !this.is_explanation_expand;
    }

    toggleLoadModal() {
        this.is_load_modal_open = !this.is_load_modal_open;
    }

    getRecentFileIcon = save_type => {
        switch (save_type) {
            case save_types.UNSAVED:
                return 'IcReports';
            case save_types.LOCAL:
                return 'IcDesktop';
            case save_types.GOOGLE_DRIVE:
                return 'IcGoogleDrive';
            default:
                return 'IcReports';
        }
    };

    getSaveType = save_type => {
        switch (save_type) {
            case save_types.UNSAVED:
                return localize('Unsaved');
            case save_types.LOCAL:
                return localize('Local');
            case save_types.GOOGLE_DRIVE:
                return localize('Google Drive');
            default:
                return localize('Unsaved');
        }
    };

    readFile = (is_preview, drop_event, file) => {
        const file_name = file && file.name.replace(/\.[^/.]+$/, '');
        const reader = new FileReader();

        reader.onload = action(e => {
            const load_options = { block_string: e.target.result, drop_event, from: save_types.LOCAL };

            if (is_preview) {
                const ref = document.getElementById('load-strategy__blockly-container');

                this.local_workspace = Blockly.inject(ref, {
                    media: `${__webpack_public_path__}media/`, // eslint-disable-line
                    zoom: {
                        wheel: false,
                        startScale: config.workspaces.previewWorkspaceStartScale,
                    },
                    readOnly: true,
                    scrollbars: true,
                });
                load_options.workspace = this.local_workspace;
            } else {
                load_options.workspace = Blockly.derivWorkspace;
                load_options.file_name = file_name;
            }

            load(load_options);
        });
        reader.readAsText(file);
    };
    readRemoteFile = (is_preview, drop_event, xml) => {
        const load_options = { block_string: xml, drop_event, from: save_types.LOCAL };

        // if (is_preview) {
        //     const ref = document.getElementById('load-strategy__blockly-container');

        //     this.local_workspace = Blockly.inject(ref, {
        //         media: `${__webpack_public_path__}media/`, // eslint-disable-line
        //         zoom: {
        //             wheel: false,
        //             startScale: config.workspaces.previewWorkspaceStartScale,
        //         },
        //         readOnly: true,
        //         scrollbars: true,
        //     });
        //     load_options.workspace = this.local_workspace;
        // } else {
        load_options.workspace = Blockly.derivWorkspace;
        load_options.file_name = 'meuRoboTeste';
        // }

        load(load_options);
    };
}
