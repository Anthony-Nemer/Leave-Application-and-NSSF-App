import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import AddInsuredModal from '../BankInsuredModal/AddInsuredModal';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import './BankEmployeeTable.css';
import Axios from 'axios';



const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'


    const BankEmployeeTable = ({ token, userId, bankEmployees, getBankEmployees, bankRelations, pureBankEmployees, getPureBankEmployees}) =>{
    const navigate = useNavigate();

    const [selectedBankEmployee, setSelectedBankEmployee]= useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bankLocations, setBankLocations] = useState([]);
    const [bankCompanies, setBankCompanies] = useState([])

    const handleAddEmployee = () => {
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleInsuredAdded = (newEmployee) => {
        getBankEmployees();
        getPureBankEmployees();
        handleCloseModal();
    };

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
    };


    const columns = [
        { field: 'id', headerName: 'ID', width: 75, align: 'center', headerAlign: 'center' },
        { field: 'nssf_no', headerName: 'NSSF No.', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'first_name_en', headerName: 'First Name - En', width: 150, align: 'center', headerAlign: 'center' },
        { field: 'last_name_en', headerName: 'Last Name - En', width: 200, align: 'center', headerAlign: 'center' },
        { field: 'first_name_ar', headerName: 'First Name - Ar', width: 150, align: 'center', headerAlign: 'center' },
        { field: 'last_name_ar', headerName: 'Last Name - Ar', width: 200, align: 'center', headerAlign: 'center' },
        { field: 'relation', headerName: 'Relation', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'related_to_full_name', headerName: 'Related to', width: 100, align: 'center', headerAlign: 'center', renderCell: (params) => (params.row.related_to_full_name ? `${params.row.related_to_full_name}` : "None"),},
        { field: 'bank_pin', headerName: 'Bank Pin', width: 100, align: 'center', headerAlign: 'center' },
        { field: 'branch_location', headerName: 'Location', width: 250, align: 'center', headerAlign: 'center' },
        { field: 'company_name', headerName: 'Company', width: 150, align: 'center', headerAlign: 'center' },
        { field: 'date_of_birth', headerName: 'Date of Birth', width: 150, renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString('en-GB') : '', align: 'center', headerAlign: 'center' },
    ];
    
    const handleRowClick = (params) => {
        setSelectedBankEmployee(params.row);
        navigate(`/bankEmployee/${params.row.id}`);
    };

    useEffect(() => {
        const fetchBankCompanies = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/bank_companies`);
                setBankCompanies(response.data);
            } catch (error) {
                console.error('Error fetching bank companies:', error);
            }
        };
        const fetchBankLocations = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/bank_location`, {
                    headers: { Authorization: `Bearer ${getCookie('access_token')}` },
                });
                setBankLocations(response.data);
            } catch (error) {
                console.error('Error fetching bank locations:', error);
            }
        }

        fetchBankCompanies();
        fetchBankLocations();
        getBankEmployees();
    }, []);

    return(
            <div className="employees__table--container">
                    <div className="employees__table--header">
                        <Button
                            style={{ marginBottom: "10px" }}
                            variant="contained"
                            onClick={() => navigate(`/bank-info`)}
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
                        <h1>Bank Insured</h1>
                        <div className='addUpdateButtons'>
                        <Button startIcon={<AddIcon />} variant="outlined" color="success" size="small" onClick={handleAddEmployee}>
                            Add Insured
                        </Button>
                        </div>
                    </div>
              
                

                <DataGrid 
                    onRowClick={handleRowClick} 
                    rows={bankEmployees} 
                    rowsPerPageOptions={[50]} 
                    columns={columns} 
                    sx={{
                        '& .MuiDataGrid-row:hover': {
                            cursor: 'pointer',
                        },
                    }}
                />

                    <AddInsuredModal
                    token={token}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onInsuredAdded={handleInsuredAdded}
                    bankLocations ={bankLocations} 
                    bankCompanies={bankCompanies} 
                    bankRelations={bankRelations} 
                    pureBankEmployees={pureBankEmployees}
                />
            </div>
        );
};

export default BankEmployeeTable;