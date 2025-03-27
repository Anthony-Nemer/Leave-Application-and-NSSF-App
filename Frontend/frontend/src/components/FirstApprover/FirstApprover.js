import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Modal } from '@mui/material';
import FirstApproverSharedCalendar from '../FirstApproverSharedCalendar/FirstApproverSharedCalendar'; 

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const FirstApprovalRequests = ({ token }) => {
    const [requests, setRequests] = useState([]);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false); // State to manage the modal open/close

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/first-approval-requests`, {
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
                }));
                setRequests(formattedRequests);
            } catch (error) {
                console.error('Error fetching requests:', error);
            }
        };

        fetchRequests();
    }, [token]);

    const handleApprove = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/first-approve`, { action: 'approve' }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRequests(requests.filter(req => req.id !== id));
        } catch (error) {
            console.error('Error approving request:', error);
        }
    };

    const handleReject = async (id) => {
        try {
            await Axios.patch(`${baseUrl}/leave-requests/${id}/first-approve`, { action: 'reject' }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRequests(requests.filter(req => req.id !== id));
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const handleFirstApproveCancel = async(id) =>{
        try{
            await Axios.patch(`${baseUrl}/leave-requests/${id}/first-cancel-approve`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRequests(requests.filter(req => req.id !== id));
        }catch(error){
            console.error('Error approving cancel request: ', error)
        }
    };

    const handleFirstRejectCancelRequest = async(id) =>{
        try{
            await Axios.patch(`${baseUrl}/leave-requests/${id}/first-cancel-reject`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRequests(requests.filter(req => req.id !== id));
        }catch(error){
            console.error('Error rejecting cancel request: ', error)
        }

    };
    
    const columns = [
        { field: 'employeeId', headerName: 'Employee ID', flex: 0.5 },
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'typeOfLeave', headerName: 'Type of Leave', flex: 1.5 },
        { field: 'requestStatus', headerName: 'Request Status', flex: 1.5 },
        { field: 'quantity', headerName: 'No. Of Days', flex: 1 },
        { field: 'time', headerName: 'Time', flex: 1 },
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
                        Attachment
                    </a>
                ) : (
                    <span></span>
                )
            )
        },
        { field: 'dates', headerName: 'Dates', flex: 1 },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1.5,
            renderCell: (params) => (
                <>
                {params.row.requestStatus === 'Pending First Approval' && (
                <>
                    <Button 
                        variant="contained" 
                        color="success" 
                        style={{ marginRight: 10 }} 
                        size="small"
                        onClick={() => handleApprove(params.row.id)}>
                        Approve
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error"
                        size="small" 
                        onClick={() => handleReject(params.row.id)}>
                        Reject
                    </Button>
                </>
                )}
                {params.row.requestStatus === 'Cancel Requested - Pending First Approval' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleFirstApproveCancel(params.row.id)}
                                size="small"
                                style={{ marginRight: 10 }}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => handleFirstRejectCancelRequest(params.row.id)}
                                size="small"
                            >
                                Reject
                            </Button>
                        </>
                    )}
                </>
            ),
        },
        { field: 'lastModified', headerName: 'Last Modified', flex: 1.5},
    ];

    return (
        <div className="leave-requests-container">
            <h1 className="title">First Approval Requests</h1>
            <Button 
                variant="contained" 
                style={{ position: 'absolute', top: 20, right: 20 }}
                onClick={() => setIsCalendarOpen(true)}
            >
                Shared Calendar
            </Button>
            <div className="data-grid-container">
                <div style={{ height: 400, width: '100%' }}>
                    <DataGrid rows={requests} columns={columns} pageSize={10} rowsPerPageOptions={[10]} />
                </div>
            </div>
            <Modal
                open={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                aria-labelledby="shared-calendar-modal"
                aria-describedby="shared-calendar-modal-description"
            >
                <div className="modal">
                    <FirstApproverSharedCalendar token={token} onClose={() => setIsCalendarOpen(false)} />
                </div>
            </Modal>
        </div>
    );
};

export default FirstApprovalRequests;
