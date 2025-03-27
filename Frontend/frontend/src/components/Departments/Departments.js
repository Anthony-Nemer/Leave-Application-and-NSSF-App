import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditDepartmentModal from '../EditDepartmentModal/EditDepartmentModal';
import './Departments.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const Departments = ({ token }) => {
    const [departments, setDepartments] = useState([]);
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/departments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setDepartments(response.data);
            } catch (error) {
                console.error('Error fetching departments:', error);
            }
        };

        fetchDepartments();
    }, [token]);

    const handleClickOpenAdd = () => {
        setOpenAddDialog(true);
    };

    const handleCloseAdd = () => {
        setOpenAddDialog(false);
        setError('');
    };

    const handleAddDepartment = async () => {
        // Check if department already exists
        const departmentExists = departments.some(dept => dept.name.toLowerCase() === newDepartmentName.toLowerCase());
        if (departmentExists) {
            setError('Department already exists');
            return;
        }

        try {
            const hrUser = getCookie('user_id'); // Retrieve the HR user ID from cookie
            const response = await Axios.post(`${baseUrl}/departments`, { name: newDepartmentName, hrUser }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newDepartment = response.data;

            setDepartments([...departments, newDepartment]);

            setNewDepartmentName('');
            handleCloseAdd();
        } catch (error) {
            console.error('Error adding department:', error);
        }
    };

    const getCookie = (cname) => {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    };

    const handleRowClick = (params) => {
        setSelectedDepartment(params.row);
        setOpenEditDialog(true);
    };

    const handleDepartmentUpdated = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/departments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDepartments(response.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    return (
        <div className="departments-container">
            <div className="departments-header">
                <h1>Departments</h1>
                <Button variant="outlined" color="primary" onClick={handleClickOpenAdd}>
                    Add Department
                </Button>
            </div>
            <div className="departments-table-container">
                <DataGrid
                    rows={departments}
                    columns={[
                        { field: 'id', headerName: 'Department ID', flex: 0.5, align: 'center', headerAlign: 'center'},
                        { field: 'name', headerName: 'Department Name', flex: 1, align: 'center', headerAlign: 'center'},
                    ]}
                    pageSize={10}
                    onRowClick={handleRowClick}
                    autoHeight
                    disableSelectionOnClick
                />
            </div>
            <Dialog open={openAddDialog} onClose={handleCloseAdd}>
                <DialogTitle>Add New Department</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To add a new department, please enter the department name and manager ID here.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Department Name"
                        fullWidth
                        value={newDepartmentName}
                        onChange={(e) => {
                            setNewDepartmentName(e.target.value);
                            setError('');
                        }}
                        error={!!error}
                        helperText={error}
                        autoComplete="off"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAdd} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleAddDepartment} color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
            <EditDepartmentModal
                isOpen={openEditDialog}
                onClose={() => setOpenEditDialog(false)}
                department={selectedDepartment}
                onDepartmentUpdated={handleDepartmentUpdated}
                token={token}
            />
        </div>
    );
};

export default Departments;
