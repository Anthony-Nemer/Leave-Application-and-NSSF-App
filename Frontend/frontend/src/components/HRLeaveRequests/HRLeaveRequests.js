import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import { Button, TextField } from '@mui/material';
import './HRLeaveRequests.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const HrLeaveRequests = ({ token }) => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [approvedDays, setApprovedDays] = useState({}); // Store the number of approved days for each request

    useEffect(() => {
        const fetchLeaveRequests = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/hr-leave-requests`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const formattedRequests = response.data.map(request => ({
                    ...request,
                    time: ['Marital', 'Paternity', 'Maternity'].includes(request.typeOfLeave) ? '' : request.time,
                    lastModified: new Date(request.lastModified).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric',
                        hour12: true,
                    }),
                    attachment: request.attachment,
                }));
                setLeaveRequests(formattedRequests);
            } catch (error) {
                console.error('Error fetching HR leave requests:', error);
                alert('Error approving leave request: '+(error.response ? error.response.data.message : error.message))
            }
        };

        fetchLeaveRequests();
    }, [token]);

    // Handle HR approval with partial days
    const handleApprove = async (id) => {
        try {
            const days = parseFloat(approvedDays[id]); // Fetch the approved days from the state


            if (days < 0 || isNaN(days)) {
                alert("Please enter a valid number of days to approve");
                return;
            }

            await Axios.patch(`${baseUrl}/leave-requests/${id}/hr-approve`, 
                { action: 'approve', approvedDays: days }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            setLeaveRequests(leaveRequests.map(req => 
                req.id === id ? { ...req, requestStatus: 'Approved', quantity: days } : req
            ));
        } catch (error) {
            console.error('Error approving leave request:', error);
        }
    };

    const handleReject = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/hr-approve`, 
                { action: 'reject' }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            setLeaveRequests(leaveRequests.map(req => 
                req.id === id ? { ...req, requestStatus: 'Rejected' } : req
            ));
        } catch (error) {
            console.error('Error rejecting leave request:', error);
        }
    };

    const handleHRapproveCancel = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/hr-cancel-approve`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, requestStatus: 'Cancelled' } : req));
        } catch (error) {
            console.error('Error approving cancel request:', error);
        }
    };
    

    const handleHRrejectCancelRequest = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/hr-cancel-reject`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, requestStatus: 'Approved' } : req));
        } catch (error) {
            console.error('Error rejecting cancel request:', error);
        }
    };


    // Update the approved days for the specific request
    const handleApprovedDaysChange = (id, value) => {
        setApprovedDays({
            ...approvedDays,
            [id]: value,
        });
    };

    const columns = [
        { field: 'employeeId', headerName: 'Employee ID', width: 100 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'typeOfLeave', headerName: 'Type of Leave', width: 250 },
        { field: 'requestStatus', headerName: 'Request Status', width: 150 },
        { field: 'quantity', headerName: 'No. Of Days', width: 150 },
        { field: 'time', headerName: 'Time', width: 200 },
        { field: 'dates', headerName: 'Dates', width: 200 },
        {
            field: 'attachment',
            headerName: 'Attachment',
            width:100,
            renderCell: (params) => (
                params.row.attachment ? (
                    <a 
                        href={`${baseUrl}/uploads/${params.row.attachment}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Download
                    </a>
                ) : (
                    <span></span>
                )
            )
        },
        {
            field: 'approvedDays',
            headerName: 'Approved Days',
            width: 150,
            renderCell: (params) => (
                params.row.requestStatus === 'Pending HR' ? (
                    <TextField
                        label="Days"
                        type="number"
                        variant="outlined"
                        size="small"
                        value={approvedDays[params.row.id] || ''}
                        onChange={(e) => handleApprovedDaysChange(params.row.id, e.target.value)}
                        InputProps={{ inputProps: { min: 0, step: 0.5, max: params.row.quantity } }} // Allow half days
                    />
                ) : (
                    <span>{params.row.quantity}</span>
                )
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            renderCell: (params) => (
                <>
                    {params.row.requestStatus === 'Pending HR' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleApprove(params.row.id)}
                                size="small"
                                style={{ marginRight: 10 }}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => handleReject(params.row.id)}
                                size="small"
                            >
                                Reject
                            </Button>
                        </>
                    )}
                    {params.row.requestStatus === 'Cancel Requested - Pending HR' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleHRapproveCancel(params.row.id)}
                                size="small"
                                style={{ marginRight: 10 }}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => handleHRrejectCancelRequest(params.row.id)}
                                size="small"
                            >
                                Reject
                            </Button>
                        </>
                    )}
                </>
            ),
        },
        { field: 'lastModified', headerName: 'Last Modified', width: 200 },
    ];

    return (
        <div className="leave-requests-container">
            <h1 className="title">HR Leave Requests</h1>
            <div className="data-grid-container">
                <DataGrid 
                    rows={Array.isArray(leaveRequests) ? leaveRequests : []}
                    columns={columns} 
                    pageSize={10} 
                    rowsPerPageOptions={[10]} 
                    checkboxSelection 
                    disableSelectionOnClick 
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

export default HrLeaveRequests;

