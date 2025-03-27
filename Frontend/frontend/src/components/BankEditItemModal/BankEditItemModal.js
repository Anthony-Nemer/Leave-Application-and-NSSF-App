import React, { useState, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Button } from '@mui/material';
import Axios from 'axios';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const BankEditItemModal = ({ isOpen, onClose, item, onItemUpdated, token }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [percentage, setPercentage] = useState('');

    useEffect(() => {
        if (item) {
            setName(item.item_name || '');
            setPrice(item.price !== null && item.price !== undefined ? item.price : '');
            setPercentage(item.percentage !== null && item.percentage !== undefined ? (item.percentage) : '');
        }
    }, [item]);

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        try {
            const updateData = {
                item_name: name,
                price: price.trim() === "" || isNaN(parseFloat(price)) ? null : parseFloat(price),
                percentage: percentage.trim() === "" || isNaN(parseFloat(percentage)) ? null : parseFloat(percentage) / 100,
            };
            console.log("Data being sent to API:", updateData); // Debugging

            await Axios.patch(`${baseUrl}/bank-item/${item.id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
    
            onItemUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };
    
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Modify the item's details below.
                </DialogContentText>
                <form onSubmit={handleSubmit}>
                    {/* Item Name */}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Item Name"
                        fullWidth
                        autoComplete="off"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    
                    {/* Price */}
                    <TextField
                        margin="dense"
                        label="Price ($)"
                        type="number"
                        fullWidth
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        inputProps={{ step: "0.01", min: "0" }}
                    />

                    {/* Percentage */}
                    <TextField
                        margin="dense"
                        label="Percentage (%)"
                        type="number"
                        fullWidth
                        value={percentage}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (!isNaN(value) && value >= 0 && value <= 100)) {
                                setPercentage(value);
                            }
                        }}
                        inputProps={{ step: "0.01", min: "0", max: "100" }}
                        helperText="Enter a value between 0 and 100"
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

export default BankEditItemModal;
