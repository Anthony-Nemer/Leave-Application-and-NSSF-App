import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

import './ManagerSummary.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const ManagerSummary = ({ token, userId }) => {
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTeam = async () => {
            if (!userId) {
                console.error("Manager ID is undefined");
                return;
            }
            
            try {
                console.log("Fetching team for manager ID:", userId); // Debugging log
    
                const response = await axios.get(`${baseUrl}/fetch-team`, {
                    params: { manager_id: userId }
                });
    
                setTeamMembers(response.data);
            } catch (error) {
                console.error("Error fetching team members:", error);
            }
        };
    
        fetchTeam();
    }, [userId, token]); // Ensure effect runs when userId or token changes
    

    const columns = [
        { field: 'id', headerName: 'ID', width: 75, align: 'center', headerAlign: 'center' },
        { field: 'full_name', headerName: 'Name', width: 150, align: 'center', headerAlign: 'center' },
        { field: 'location_name', headerName: 'Location', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'first_approver_full_name', headerName: 'First Approval', width: 200, align: 'center', headerAlign: 'center' },
        { field: 'leave_days_on_jan_1', headerName: 'Jan1 Add', width: 150, align: 'center', headerAlign: 'center' },
        { field: 'days', headerName: 'Balance', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'paid_leaves_taken', headerName: 'Paid Leave', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'sick_leaves_with_medical_report_taken', headerName: 'Sick/Report', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'sick_leaves_allowed_taken', headerName: 'Sick/Allowed', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'compassionate_taken', headerName: 'Compassionate', width: 150, align: 'center', headerAlign: 'center' },
        { field: 'marital_taken', headerName: 'Marital', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'maternity_taken', headerName: 'Maternity', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'paternity_taken', headerName: 'Paternity', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'unpaid_leave_taken', headerName: 'Unpaid', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'start_date', headerName: 'Start Date', width: 150, renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString('en-GB') : '', align: 'center', headerAlign: 'center' },
        { field: 'end_date', headerName: 'End Date', width: 150, renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString('en-GB') : '', align: 'center', headerAlign: 'center' },
    ];

    return (
        <div>
            <div className="employees__table--container">
                <div className="employees__table--header">
                    <h1>Team Members</h1>
                </div>
                <DataGrid 
                    rows={teamMembers} 
                    rowsPerPageOptions={[50]} 
                    columns={columns} 
                    loading={loading}
                    sx={{
                        '& .MuiDataGrid-row:hover': {
                            cursor: 'pointer',
                        },
                    }}
                />
            </div>
        </div>
    );
};

export default ManagerSummary;
