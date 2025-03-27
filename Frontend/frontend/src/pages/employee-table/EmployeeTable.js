import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import AddEmployeeModal from '../../components/EmployeeModal/AddEmployeeModal';
import UpdateEmployeeModal from '../../components/UpdateEmployeeModal/UpdateEmployeeModal';
import './EmployeeTable.css';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RemoveIcon from '@mui/icons-material/Remove';
import axios from 'axios';


const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
const EmployeeTable = ({ token, employees, getEmployees, departments, locations }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAddEmployee = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };
    const handleUpdateEmployee = () => {
        setIsUpdateModalOpen(true);
    };

    const handleCloseUpdateModal = () => {
        setIsUpdateModalOpen(false);
    };

    const handleEmployeeAdded = (newEmployee) => {
        getEmployees();
        handleCloseModal();
    };

    const handleEmployeeUpdated = () => {
        getEmployees()
        handleCloseUpdateModal()
    }

    const handleRowClick = (params) => {
        setSelectedEmployee(params.row);
        navigate(`/employee/${params.row.id}`);
    };

    const handleDeductLeave = async () => {
        setLoading(true)
        try{
            const response = await axios.post(`${baseUrl}/deduct-leave`)
            alert(response.data.message || 'Leave deduction process completed successfully.')
        }catch(error){
            console.error('Error triggering leave deduction:', error)
            alert('An error occurred while processing leave deduction')
        }finally{
            setLoading(false)
        }
    }

    const columns = [
        { field: 'id', headerName: 'ID', width: 75, align: 'center', headerAlign: 'center' },
        { field: 'full_name', headerName: 'Name', width: 150, align: 'center', headerAlign: 'center' },
        { field: 'email', headerName: 'Email', width: 200, align: 'center', headerAlign: 'center' },
        { field: 'department_name', headerName: 'Department', width: 250, align: 'center', headerAlign: 'center' },
        { field: 'manager_full_name', headerName: 'Manager', width: 150, align: 'center', headerAlign: 'center' },
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
                    <h1>Employees</h1>
                    <div className='addUpdateButtons'>
                        <Button startIcon={<AddIcon />} variant="outlined" color="success" size="small" onClick={handleAddEmployee}>
                            Add Employee
                        </Button>
                        <Button startIcon={<EditIcon />} variant="outlined" color="primary" size="small" onClick={handleUpdateEmployee} style={{marginLeft:'10px'}}>
                            Update Approvers
                        </Button>
                        <Button startIcon={<RemoveIcon />} variant="outlined" color="error" size="small" onClick={handleDeductLeave} disabled={loading} style={{marginLeft:'10px'}}>
                            {loading ? 'Processing...' : 'Deduct Leaves'}
                        </Button>
                    </div>
                </div>
                <DataGrid 
                    onRowClick={handleRowClick} 
                    rows={employees} 
                    rowsPerPageOptions={[50]} 
                    columns={columns} 
                    sx={{
                        '& .MuiDataGrid-row:hover': {
                            cursor: 'pointer',
                        },
                    }}
                />
                <AddEmployeeModal
                    token={token}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onEmployeeAdded={handleEmployeeAdded}
                    departments={departments}
                    locations={locations}
                    employees={employees}
                    selectedEmployee={selectedEmployee}
                />
                <UpdateEmployeeModal
                    token={token}
                    isOpen={isUpdateModalOpen}
                    onClose={handleCloseUpdateModal}
                    onEmployeeUpdated={handleEmployeeUpdated}
                />
            </div>
        </div>
    );
};

export default EmployeeTable;