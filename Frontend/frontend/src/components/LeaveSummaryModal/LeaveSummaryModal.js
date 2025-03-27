import React from 'react';
import Modal from '@mui/material/Modal';
import LeaveSummary from '../LeaveSummary/LeaveSummary';
import './LeaveSummaryModal.css';

const LeaveSummaryModal = ({ isOpen, onClose, employeeId }) => {
    return (
        <Modal open={isOpen} onClose={onClose}>
            <div className="leave-summary-modal">
                <button className="close-button" onClick={onClose}>X</button>
                <LeaveSummary employeeId={employeeId} />
            </div>
        </Modal>
    );
};

export default LeaveSummaryModal;

