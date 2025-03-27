import React, { useState, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Button } from '@mui/material';
import Axios from 'axios';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const UpdateEmployeeModal = ({ isOpen, onClose, onEmployeeUpdated, token }) => {
    const [oldManagerId, setOldManagerId] = useState('');
    const [newManagerId, setNewManagerId] = useState('');
    const [oldFirstApproverId, setOldFirstApproverId] = useState('');
    const [newFirstApproverId, setNewFirstApproverId] = useState('');

    const getCookie = (cname) => {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    const resetFields=()=>{
        setOldManagerId('');
        setNewManagerId('');
        setOldFirstApproverId('');
        setNewFirstApproverId('');
    };

    useEffect(()=>{
        if(!isOpen){
            resetFields()
        }
    }, [isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const hrUser = getCookie('user_id'); // Retrieve the HR user ID from cookie
           
            // Construct update data conditionally
            let updateData = { hrUser };
            if (oldManagerId && newManagerId) {
                updateData.oldManagerId = oldManagerId;
                updateData.newManagerId = newManagerId;
            }
            if (oldFirstApproverId && newFirstApproverId) {
                updateData.oldFirstApproverId = oldFirstApproverId;
                updateData.newFirstApproverId = newFirstApproverId;
            }
            // Make the PATCH request to update manager and/or first approver
            await Axios.patch(`${baseUrl}/employees/update-approvers`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onEmployeeUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating employee approvers:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogTitle>Update Manager and/or First Approver</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    To update the manager and/or first approver, please provide the old and new IDs.
                </DialogContentText>
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Old Manager ID"
                        fullWidth
                        margin="dense"
                        value={oldManagerId}
                        onChange={(e) => setOldManagerId(e.target.value)}
                    />
                    <TextField
                        label="New Manager ID"
                        fullWidth
                        margin="dense"
                        value={newManagerId}
                        onChange={(e) => setNewManagerId(e.target.value)}
                    />
                    <TextField
                        label="Old First Approver ID"
                        fullWidth
                        margin="dense"
                        value={oldFirstApproverId}
                        onChange={(e) => setOldFirstApproverId(e.target.value)}
                    />
                    <TextField
                        label="New First Approver ID"
                        fullWidth
                        margin="dense"
                        value={newFirstApproverId}
                        onChange={(e) => setNewFirstApproverId(e.target.value)}
                    />
                    <DialogActions>
                        <Button onClick={onClose} color="primary">
                            Cancel
                        </Button>
                        <Button type="submit" color="primary">
                            Save
                        </Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateEmployeeModal;