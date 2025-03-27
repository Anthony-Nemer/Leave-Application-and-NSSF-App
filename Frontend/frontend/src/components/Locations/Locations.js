import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import './Locations.css';
import EditLocationModal from '../EditLocationModal/EditLocationModal';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const Locations = ({ token }) => {
    const [locations, setLocations] = useState([]);
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null); // For holding the selected location for editing
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/location`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLocations(response.data);
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };

        fetchLocations();
    }, [token]);

    const handleClickOpenAdd = () => {
        setOpenAddDialog(true);
    };

    const handleCloseAdd = () => {
        setOpenAddDialog(false);
        setError('');
    };

    const handleAddLocation = async () => {
        // Check if location already exists
        const locationExists = locations.some(loc => loc.location_name.toLowerCase() === newLocationName.toLowerCase());
        if (locationExists) {
            setError('Location already exists');
            return;
        }

        try {
            const response = await Axios.post(`${baseUrl}/location`, { location_name: newLocationName}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newLocation = response.data;

            setLocations([...locations, newLocation]);

            setNewLocationName('');
            handleCloseAdd();
        } catch (error) {
            console.error('Error adding location:', error);
        }
    };

    const handleRowClick = (params) => {
        setSelectedLocation(params.row); // Set the selected location
        setOpenEditDialog(true); // Open the edit dialog
    };

    const handleLocationUpdated = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/location`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLocations(response.data);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    return (
        <div className="locations-container">
            <div className="locations-header">
                <h1>Locations</h1>
                <Button variant="outlined" color="primary" onClick={handleClickOpenAdd}>
                    Add Location
                </Button>
            </div>
            <div className="locations-table-container">
                <DataGrid
                    rows={locations}
                    columns={[
                        { field: 'id', headerName: 'Location ID', flex: 0.5, align: 'center', headerAlign: 'center' },
                        { field: 'location_name', headerName: 'Location Name', flex: 0.5, align: 'center', headerAlign: 'center' },
                    ]}
                    pageSize={10}
                    autoHeight
                    disableSelectionOnClick
                    onRowClick={handleRowClick} // Handle row click to edit
                />
            </div>
            <Dialog open={openAddDialog} onClose={handleCloseAdd}>
                <DialogTitle>Add New Location</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To add a new location, please enter the location name
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Location Name"
                        fullWidth
                        value={newLocationName}
                        onChange={(e) => {
                            setNewLocationName(e.target.value);
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
                    <Button onClick={handleAddLocation} color="primary">
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
            <EditLocationModal
                isOpen={openEditDialog}
                onClose={() => setOpenEditDialog(false)}
                location={selectedLocation} // Pass the selected location
                onLocationUpdated={handleLocationUpdated} // Callback to refresh the locations after update
                token={token}
            />
        </div>
    );
};

export default Locations;
