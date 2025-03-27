import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Modal } from '@mui/material';
import SharedCalendar from '../SharedCalendar/SharedCalendar';
import './ManagerLeaveRequests.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const ManagerLeaveRequests = ({ token }) => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        const fetchLeaveRequests = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/manager-leave-requests`, {
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
                console.error('Error fetching leave requests:', error);
            }
        };

        fetchLeaveRequests();
    }, [token]);

    const handleApprove = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, requestStatus: 'Approved' } : req));
        } catch (error) {
            console.error('Error approving leave request:', error);
        }
    };

    const handleReject = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, requestStatus: 'Rejected' } : req));
        } catch (error) {
            console.error('Error rejecting leave request:', error);
        }
    };

    const handleApproveCancel = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/cancel-approve`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, requestStatus: 'Cancel Requested - Pending HR' } : req));
        } catch (error) {
            console.error('Error approving cancel request:', error);
        }
    };

    const handleRejectCancelRequest = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/cancel-reject`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, requestStatus: 'Approved' } : req));
        } catch (error) {
            console.error('Error rejecting cancel request:', error);
        }
    };

    const columns = [
        { field: 'employeeId', headerName: 'Employee ID', width: 100 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'typeOfLeave', headerName: 'Type of Leave', width: 250 },
        { field: 'requestStatus', headerName: 'Request Status', width: 150 },
        { field: 'quantity', headerName: 'No. of Days', width: 100 },
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
            field: 'actions',
            headerName: '',
            width: 200,
            renderCell: (params) => (
                <>
                    {params.row.requestStatus === 'Pending Manager' && (
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
                    {params.row.requestStatus === 'Cancel Requested - Pending Manager' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleApproveCancel(params.row.id)}
                                size="small"
                                style={{ marginRight: 10 }}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => handleRejectCancelRequest(params.row.id)}
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
            <h1 className="title">Manager Leave Requests</h1>
            <Button 
                variant="contained" 
                style={{ position: 'absolute', top: 20, right: 20 }}
                onClick={() => setIsCalendarOpen(true)}
            >
                Shared Calendar
            </Button>
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
            <Modal
                open={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                aria-labelledby="shared-calendar-modal"
                aria-describedby="shared-calendar-modal-description"
            >
                <div className="modal">
                    <SharedCalendar token={token} onClose={() => setIsCalendarOpen(false)} />
                </div>
            </Modal>
        </div>
    );
};

export default ManagerLeaveRequests;
