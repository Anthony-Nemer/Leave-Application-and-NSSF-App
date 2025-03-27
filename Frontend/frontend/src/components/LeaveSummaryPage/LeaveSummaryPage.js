import React from 'react';
import LeaveSummary from '../LeaveSummary/LeaveSummary';
import './LeaveSummaryPage.css';

const LeaveSummaryPage = ({ employeeId }) => {
    return (
        <div className="leave-summary-page">
            <LeaveSummary employeeId={employeeId} />
        </div>
    );
};

export default LeaveSummaryPage;
