import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Axios from 'axios';
import './BankPayments.css'

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const BankPayments = ({ token, userId }) => {
    const navigate = useNavigate();

    const [paymentName, setPaymentName] = useState('');
    const [paymentDesc, setPaymentDesc] = useState('');
    const [dollarRate, setDollarRate] = useState('');
    const [payments, setPayments] = useState([]);
    const [error, setError] = useState('');


    const fetchPayments = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/bank_payments`);
            setPayments(response.data);
        } catch (error) {
            console.error('Error fetching bank payments:', error);
            setError('Error fetching payments');
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault(); 

        if (!paymentName || !paymentDesc || !dollarRate) {
            setError('All fields are required');
            return;
        }

        var newPayment = {
            payment_name: paymentName,
            description: paymentDesc,
            rate: dollarRate,
            userId: userId, 
        };

        try {
            const response = await Axios.post(`${baseUrl}/add-new-payment`, newPayment, {
                headers: { Authorization: `Bearer ${token}` },
            });

            newPayment = response.data; 
            setPayments((prev) => [...prev, newPayment]); 
            setPaymentName(''); 
            setPaymentDesc('');
            setDollarRate('');
        } catch (error) {
            console.error('Error adding payment:', error);
            setError(error.response?.data?.message || 'An unexpected error occurred.');
        }
    };


    const handleDollarRateChange = (e) => {
        const value = e.target.value;
        // Ensure the value is a valid non-negative number
        if (value >= 0 || value === "") { 
            setDollarRate(value);
        }
        else{
            setError('Enter a valid dollar rate.')
        }
    };

    
    const handleCloseClick = async (id) => {
        const confirmClose = window.confirm('Are you sure you want to close this payment?');
        
        if (confirmClose) {
            try {
                const response = await Axios.patch(
                    `${baseUrl}/close-payment`,
                    { id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setPayments((prevPayments) =>
                    prevPayments.map((payment) =>
                        payment.id === id ? { ...payment, status: 'closed' } : payment
                    )
                );
            } catch (error) {
                console.error('Error closing payment:', error);
            }
        } else {
            return;
        }
    };

    const handleActivatePayment = async (id) => {
        const confirmClose = window.confirm('Are you sure you want to edit this payment?');
        
        if (confirmClose) {
            try {
                const response = await Axios.patch(
                    `${baseUrl}/activate-payment`,
                    { id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setPayments((prevPayments) =>
                    prevPayments.map((payment) =>
                        payment.id === id ? { ...payment, status: 'active' } : payment
                    )
                );
            } catch (error) {
                console.error('Error closing payment:', error);
            }
        } else {
            return;
        }
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 75, align: 'center', headerAlign: 'center' },
        { field: 'payment_name', headerName: 'Name', flex: 1, align: 'center', headerAlign: 'center' },
        { field: 'description', headerName: 'Description', flex: 2, align: 'center', headerAlign: 'center' },
        { field: 'rate', headerName: 'Rate', flex: 1, align: 'center', headerAlign: 'center' },
        { field: 'status', headerName: 'Status', flex: 1, align: 'center', headerAlign: 'center' },
        {
            field: 'actions',
            headerName: '',
            flex: 0.5,
            renderCell: (params) => (
                <div>
                    {params.row.status === 'active' && (
                        <Button
                            variant="contained"
                            size="small"
                            style={{ marginRight: 10 }}
                            onClick={() => handleCloseClick(params.row.id)}
                        >
                            Close
                        </Button>
                    )}
                    {params.row.status === 'closed' && (
                        <Button
                            variant="outlined"
                            size="small"
                            style={{ marginRight: 10 }}
                            onClick={() => handleActivatePayment(params.row.id)}
                        >
                            Activate
                        </Button>
                    )}
                </div>
            ),
        },
        { field: 'user', headerName: 'Created By', flex: 1, align: 'center', headerAlign: 'center' }
    ];



    return (
        <>
            <div className="employees__table--container">
                <div className="employees__table--header">
                    <Button
                        style={{ marginBottom: "10px" }}
                        variant="contained"
                        onClick={() => navigate(`/medical-home`)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-left" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8" />
                        </svg>
                    </Button>
                    <h1>Bank Payments</h1>
                </div>

                <form className="form-group" onSubmit={handleSubmit}>
                    <label>Payment Name:
                        <input type="text" value={paymentName} onChange={(e) => setPaymentName(e.target.value)} required />
                    </label>
                    <label>Description:
                        <input type="text" value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} required />
                    </label>
                    <label>Dollar Rate:
                        <input type="number" value={dollarRate} onChange={handleDollarRateChange} required />
                    </label>
                    <div className="addUpdateButtons">
                        <Button startIcon={<AddIcon />} variant="outlined" color="primary" size="small" type="submit">
                            Add Payment
                        </Button>
                    </div>
                    {error && <p className='error-msg'>{error}</p>}
                </form>

                <DataGrid
                    rows={payments}
                    rowsPerPageOptions={[50]}
                    columns={columns}
                    sx={{
                        '& .MuiDataGrid-row:hover': {
                            cursor: 'pointer',
                        },
                    }}
                    autoHeight  
                    disableSelectionOnClick
                />
            </div>
        </>
    );
};

export default BankPayments;
