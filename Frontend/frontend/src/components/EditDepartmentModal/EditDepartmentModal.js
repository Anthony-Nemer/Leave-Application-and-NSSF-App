import React, { useState, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Button } from '@mui/material';
import Axios from 'axios';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const EditDepartmentModal = ({ isOpen, onClose, department, onDepartmentUpdated, token }) => {
    const [name, setName] = useState('');


    useEffect(() => {
        if (department) {
            setName(department.name);
        }
    }, [department]);

    const getCookie = (cname) => {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for(let i = 0; i <ca.length; i++) {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const hrUser = getCookie('user_id'); // Retrieve the HR user ID from cookie
            const updateData = { name, hrUser};

            await Axios.patch(`${baseUrl}/departments/${department.id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onDepartmentUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating department:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    To edit this department, please change the name
                </DialogContentText>
                <form onSubmit={handleSubmit}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Department Name"
                        fullWidth
                        autoComplete="off"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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

export default EditDepartmentModal;




