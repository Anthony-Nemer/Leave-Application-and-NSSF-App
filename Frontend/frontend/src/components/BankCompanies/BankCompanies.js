import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';

import Axios from 'axios';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import BankEditCompanyModal from '../BankEditCompanyModal/BankEditCompanyModal';
import './BankCompanies.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const BankCompanies = ({token}) => {
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [error, setError] = useState('');
    const [companies, setCompanies] = useState([]);


    const navigate = useNavigate();

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/bank_companies`);
                setCompanies(response.data);
            } catch (error) {
                console.error('Error fetching Bank companies:', error);
            }
        };

        fetchCompanies();
    }, [token]);

    const handleClickOpenAdd = () => {
        setOpenAddDialog(true);
    };

    const handleCloseAdd = () => {
        setOpenAddDialog(false);
        setError('');
    };

    const handleAddCompany = async () => {
        if (!newCompanyName.trim()) {
            setError('Company name is required');
            return;
        }

        try {
            const response = await Axios.post(`${baseUrl}/add-company`, { location: newCompanyName.trim() }, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            const newCompany = response.data;
            setCompanies((prev) => [...prev, newCompany]);
            setNewCompanyName('');
            handleCloseAdd();
        } catch (error) {
            console.error('Error adding company:', error);
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
        setSelectedCompany(params.row);
        setOpenEditDialog(true);
    };

    const handleCompanyUpdated = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/bank_companies`);
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching Bank companies:', error);
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
                <h1>Bank Companies</h1>
                <Button variant="outlined" color="primary" onClick={handleClickOpenAdd}>
                    Add Company
                </Button>
            </div>
            <div className="departments-table-container">
                <DataGrid
                    rows={companies}
                    columns={[
                        { field: 'id', headerName: 'Branch ID', flex: 0.5, align: 'center', headerAlign: 'center'},
                        { field: 'company_name', headerName: 'Branch Name', flex: 1, align: 'center', headerAlign: 'center'},
                    ]}
                    pageSize={10}
                    onRowClick={handleRowClick}
                    autoHeight
                    disableSelectionOnClick
                />
            </div>
            <Dialog open={openAddDialog} onClose={handleCloseAdd}>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To add a new Company, please enter the company name here.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Company Name"
                        fullWidth
                        value={newCompanyName}
                        onChange={(e) => {
                            setNewCompanyName(e.target.value);
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
                    <Button onClick={handleAddCompany} color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
            <BankEditCompanyModal
                isOpen={openEditDialog}
                onClose={() => setOpenEditDialog(false)}
                company={selectedCompany}
                onCompanyUpdated={handleCompanyUpdated}
                token={token}
            />
        </div>
    );
};

export default BankCompanies;
