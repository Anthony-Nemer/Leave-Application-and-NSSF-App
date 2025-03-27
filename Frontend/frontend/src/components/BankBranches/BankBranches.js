import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';

import Axios from 'axios';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import BankEditBranchModal from '../BankEditBranchModal/BankEditBranchModal';
import './BankBranches.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const BankBranches = ({token}) => {
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [error, setError] = useState('');
    const [branches, setBranches] = useState([]);


    const navigate = useNavigate();

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/Bank_location`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setBranches(response.data);
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };

        fetchBranches();
        console.log(branches);
    }, [token]);

    const handleClickOpenAdd = () => {
        setOpenAddDialog(true);
    };

    const handleCloseAdd = () => {
        setOpenAddDialog(false);
        setError('');
    };

    const handleAddBranch = async () => {
        if (!newBranchName.trim()) {
            setError('Branch name is required');
            return;
        }
    
        try {
            const response = await Axios.post(`${baseUrl}/add-branch`, { location: newBranchName.trim() }, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            const newBranch = response.data;
            setBranches((prev) => [...prev, newBranch]);
            setNewBranchName('');
            handleCloseAdd();
        } catch (error) {
            console.error('Error adding branch:', error);
            if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else {
                setError('An unexpected error occurred.');
            }
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
        setSelectedBranch(params.row);
        setOpenEditDialog(true);
    };

    const handleBranchUpdated = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/Bank_location`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setBranches(response.data);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    return (
        <div className="departments-container">
            <div className="departments-header">
                <Button
                    style={{ marginBottom: "10px" }}
                    variant="contained"
                    onClick={() => navigate(`/Bank-info`)}
                >
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-arrow-left"
                    viewBox="0 0 16 16"
                    >
                    <path
                        fillRule="evenodd"
                        d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
                    />
                    </svg>
                </Button>
                <h1>Branches Locations</h1>
                <Button variant="outlined" color="primary" onClick={handleClickOpenAdd}>
                    Add Branch
                </Button>
            </div>
            <div className="departments-table-container">
                <DataGrid
                    rows={branches}
                    columns={[
                        { field: 'id', headerName: 'Branch ID', flex: 0.5, align: 'center', headerAlign: 'center'},
                        { field: 'location', headerName: 'Branch Name', flex: 1, align: 'center', headerAlign: 'center'},
                    ]}
                    pageSize={10}
                    onRowClick={handleRowClick}
                    autoHeight
                    disableSelectionOnClick
                />
            </div>
            <Dialog open={openAddDialog} onClose={handleCloseAdd}>
                <DialogTitle>Add New Branch</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To add a new Branch, please enter the branch name here.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Branch Name"
                        fullWidth
                        value={newBranchName}
                        onChange={(e) => {
                            setNewBranchName(e.target.value);
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
                    <Button onClick={handleAddBranch} color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
            <BankEditBranchModal
                isOpen={openEditDialog}
                onClose={() => setOpenEditDialog(false)}
                branch={selectedBranch}
                onBranchUpdated={handleBranchUpdated}
                token={token}
            />
        </div>
    );
};

export default BankBranches;
