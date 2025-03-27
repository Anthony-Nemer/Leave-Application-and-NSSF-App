import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import BankEditItemModal from '../BankEditItemModal/BankEditItemModal';
import './BankItems.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const BankItems = ({ token }) => {
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemPercentage, setNewItemPercentage] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [error, setError] = useState('');
    const [items, setItems] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/bank_items`);
                setItems(response.data);
            } catch (error) {
                console.error('Error fetching bank items:', error);
            }
        };

        fetchItems();
    }, [token]);

    const handleClickOpenAdd = () => {
        setOpenAddDialog(true);
    };

    const handleCloseAdd = () => {
        setOpenAddDialog(false);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemPercentage('');
        setError('');
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            setError('Item name is required');
            return;
        }
        if (!newItemPrice || parseFloat(newItemPrice) <= 0) {
            setError('Price must be a positive number');
            return;
        }
        if (newItemPercentage < 0 || newItemPercentage > 100 || newItemPercentage === '') {
            setError('Percentage must be between 0 and 100');
            return;
        }

        try {
            const response = await Axios.post(`${baseUrl}/add-item`, {
                item_name: newItemName.trim(),
                price: parseFloat(newItemPrice).toFixed(2), // Store as decimal(15,2)
                percentage: (parseFloat(newItemPercentage) / 100).toFixed(2), // Convert to decimal(5,2)
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setItems((prev) => [...prev, response.data]);
            handleCloseAdd();
        } catch (error) {
            console.error('Error adding item:', error);
            setError(error.response?.data?.error || 'An unexpected error occurred.');
        }
    };

    const handleRowClick = (params) => {
        setSelectedItem(params.row);
        setOpenEditDialog(true);
    };

    const handleItemUpdated = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/bank_items`);
            setItems(response.data);
        } catch (error) {
            console.error('Error fetching bank items:', error);
        }
    };

    return (
        <div className="departments-container">
            <div className="departments-header">
                <Button style={{ marginBottom: "10px" }} variant="contained" onClick={() => navigate(`/bank-info`)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-left" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8" />
                    </svg>
                </Button>
                <h1>Bank Items</h1>
                <Button variant="outlined" color="primary" onClick={handleClickOpenAdd}>
                    Add Item
                </Button>
            </div>

            <div className="departments-table-container">
                <DataGrid
                    rows={items}
                    columns={[
                        { field: 'id', headerName: 'ID', flex: 0.5, align: 'center', headerAlign: 'center' },
                        { field: 'item_name', headerName: 'Item', flex: 1, align: 'center', headerAlign: 'center' },
                        { field: 'price', headerName: 'Price ($)', flex: 1, align: 'center', headerAlign: 'center' },
                        { field: 'percentage', headerName: 'Percentage (%)', flex: 1, align: 'center', headerAlign: 'center' },
                    ]}
                    pageSize={10}
                    onRowClick={handleRowClick}
                    autoHeight
                    disableSelectionOnClick
                />
            </div>

            {/* Add Item Dialog */}
            <Dialog open={openAddDialog} onClose={handleCloseAdd}>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To add a new item, please enter the details below.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Item Name"
                        fullWidth
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        error={!!error}
                        helperText={error}
                    />
                    <TextField
                        margin="dense"
                        label="Price ($)"
                        type="number"
                        fullWidth
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        inputProps={{ step: "0.01", min: "0" }}
                    />
                    <TextField
                        margin="dense"
                        label="Percentage (%)"
                        type="number"
                        fullWidth
                        value={newItemPercentage}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value >= 0 && value <= 100) {
                                setNewItemPercentage(value);
                            }
                        }}
                        inputProps={{ step: "0.01", min: "0", max: "100" }}
                        helperText="Enter a value between 0 and 100"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAdd} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleAddItem} color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <BankEditItemModal
                isOpen={openEditDialog}
                onClose={() => setOpenEditDialog(false)}
                item={selectedItem}
                onItemUpdated={handleItemUpdated}
                token={token}
            />
        </div>
    );
};

export default BankItems;
