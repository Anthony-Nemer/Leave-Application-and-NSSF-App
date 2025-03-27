import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import './Logs.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const Logs = ({ token }) => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/logs`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLogs(response.data.map(log => ({
                    ...log,
                    full_name: log.hr_user_name,
                    timestamp_edited: new Date(log.timestamp).toLocaleString("en-US", options)
                })));
            } catch (error) {
                console.error('Error fetching logs:', error);
            }
        };

        fetchLogs();
    }, [token]);

    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
        timeZone: 'Etc/GMT-3',
    };

    return (
        <div className="logs-container">
            <h1>Activity Logs</h1>
            <div className="logs-table-container">
                <DataGrid
                    rows={logs}
                    columns={[
                        { field: 'id', headerName: 'ID', width: 50 },
                        { field: 'full_name', headerName: 'HR User', width: 150 },
                        { field: 'action', headerName: 'Action', width: 150 },
                        { field: 'details', headerName: 'Details', flex: 1 },
                        { field: 'timestamp_edited', headerName: 'Timestamp', width: 200 }
                    ]}
                    pageSize={10}
                    autoHeight
                />
            </div>
        </div>
    );
};

export default Logs;
