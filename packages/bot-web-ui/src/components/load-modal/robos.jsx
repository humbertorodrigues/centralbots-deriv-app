import React from 'react';
import { PropTypes } from 'prop-types';
// import { Button, Icon } from '@deriv/components';
// import { Localize, localize } from '@deriv/translations';
import { connect } from 'Stores/connect';
import LocalFooter from './local-footer.jsx';
// import WorkspaceControl from './workspace-control.jsx';
const xml = 'coloca o xml aqui bb';
const RobosComponent = ({ toggleLoadModal, readRemoteFile }) => {
    // const file_input_ref = React.useRef(null);
    // const [is_file_supported, setIsFileSupported] = React.useState(true);
    function carregaRobo() {
        readRemoteFile(false, {}, xml);
        toggleLoadModal();
    }
    // if (loaded_local_file && is_file_supported) {
    return (
        <div className='load-strategy__container load-strategy__container--has-footer'>
            <button onClick={() => carregaRobo(readRemoteFile, toggleLoadModal)}>Carrega meu robô bb</button>
        </div>
    );
    // }
};

RobosComponent.propTypes = {
    handleFileChange: PropTypes.func,
    is_mobile: PropTypes.bool,
    is_open_button_loading: PropTypes.bool,
    loaded_local_file: PropTypes.string,
    setLoadedLocalFile: PropTypes.func,
};

const Robos = connect(({ load_modal, ui }) => ({
    handleFileChange: load_modal.handleFileChange,
    is_mobile: ui.is_mobile,
    is_open_button_loading: load_modal.is_open_button_loading,
    loaded_local_file: load_modal.loaded_local_file,
    setLoadedLocalFile: load_modal.setLoadedLocalFile,
    readRemoteFile: load_modal.readRemoteFile,
    toggleLoadModal: load_modal.toggleLoadModal,
}))(RobosComponent);

Robos.Footer = LocalFooter;

export default Robos;
