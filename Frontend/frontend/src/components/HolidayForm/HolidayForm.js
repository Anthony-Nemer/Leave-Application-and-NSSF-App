import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Modal, TextField, Typography, Box, IconButton } from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import CloseIcon from '@mui/icons-material/Close';
import './HolidayForm.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const HolidayForm = ({ token }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');
    const [holidays, setHolidays] = useState([]);
    const [editHolidayId, setEditHolidayId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [editMode, setEditMode] = useState(false);



    function getCookie(cname) {
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


    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/holidays`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setHolidays(response.data);
        } catch (error) {
            console.error('Error fetching holidays:', error);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const holidayData = {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            description,
        };
        console.log(holidayData)
        const buttonText = e.nativeEvent.submitter.innerText;
        console.log('Edit Holiday ID:', editHolidayId); 
        try {
            let response;
            if (buttonText === 'UPDATE HOLIDAY' && editMode) {  // Using editHolidayId instead of description
                response = await Axios.patch(`${baseUrl}/holidays/${editHolidayId}`, holidayData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log("PATCH request sent with ID:", editHolidayId);
            } else if (addMode && buttonText === 'ADD HOLIDAY') {
                response = await Axios.post(`${baseUrl}/holiday`, holidayData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
    
            console.log('Response:', response);  // Log the response to understand its structure
            if (response && response.data) {
                setMessage(response.data.message);
            } else {
                setMessage('Holiday updated successfully');
            }
            fetchHolidays(); // Refresh holidays after adding/editing
            resetForm();

        } catch (error) {
            console.error('Error adding/editing holiday:', error);
            setMessage('Error adding/editing holiday');
        }
    };

    const resetForm = () => {
        setStartDate(null);
        setEndDate(null);
        setDescription('');
        setEditHolidayId(null);
        setModalOpen(false);
        setAddMode(false);
        setEditMode(false);
    };

    const handleEdit = (holiday) => {
        setStartDate(new Date(holiday.start_date));
        setEndDate(new Date(holiday.end_date));
        setDescription(holiday.description);
        setEditHolidayId(holiday.id); 
        console.log('Set Edit Holiday ID:', holiday.id);  // Set the id for later use in patch request
        setEditMode(true);
        setModalOpen(true);
        setMessage(''); // Clear message when editing
    };
    console.log(editHolidayId)
    const handleAdd = () => {
        setAddMode(true);
        setModalOpen(true);
        setMessage(''); // Clear message when adding
    };

    const closeModal = () => resetForm();


    const deleteHoliday = (holidayId, holiday_desc) => {
        const isConfirmed = window.confirm("Are you sure you want to delete this holiday?");
        
        if (isConfirmed) {
            try {
                // Send the holidayId and holiday_desc in the request body
                Axios.delete(`${baseUrl}/delete-holiday`, {
                    data: { holidayId, holiday_desc },  // Send the holiday data in the body
                    headers: {
                        Authorization: `Bearer ${getCookie('access_token')}` // Add Authorization header
                    }
                })   
                .then(response => {
                    console.log('Holiday deleted successfully');
                    window.location.reload(); // Reload the page after deletion
                })
                .catch(error => {
                    console.error("Error deleting holiday: ", error);
                });
            } catch (error) {
                console.log('Error deleting holiday from database: ' + error);
            }
        } else {
            return;
        }
    };
    
    

    useEffect(() => {
        console.log('Modal title - editMode:', editMode, 'addMode:', addMode);
    }, [editMode, addMode]);


    return (
        <div className="holiday-form">
            <h2>Holidays</h2>
            <Button
                variant="contained"
                color="primary"
                onClick={handleAdd}
                style={{ marginBottom: '20px', float: 'right' }}
            >
                Add Holiday
            </Button>
            <TableContainer component={Paper} className="table-container">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {holidays.map((holiday) => (
                            <TableRow key={holiday.id}>
                                <TableCell>{holiday.description}</TableCell>
                                <TableCell onClick={() => handleEdit(holiday)} style={{ cursor: 'pointer' }}>
                                    {holiday.start_date === holiday.end_date
                                        ? format(new Date(holiday.start_date), 'dd-MM-yyyy')
                                        : `${format(new Date(holiday.start_date), 'dd-MM-yyyy')} >> ${format(new Date(holiday.end_date), 'dd-MM-yyyy')}`}
                                </TableCell>
                                <TableCell>
                                    <span className='del_holiday' onClick={() => deleteHoliday(holiday.id, holiday.description)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="black" className="bi bi-trash" viewBox="0 0 16 16">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                </svg>
                                </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Modal open={modalOpen} onClose={closeModal}>
                <Box className="modal-content">
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{editMode ? 'Edit Holiday' : 'Add Holiday'}</Typography>
                        <IconButton onClick={closeModal} className="close-button">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <form onSubmit={handleSubmit}>
                        <Box mt={2}>
                            <TextField
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                InputProps={{
                                    readOnly: editMode,
                                }}
                                fullWidth
                                required
                            />
                        </Box>
                        <Box mt={2}>
                            <label>Start Date:</label>
                            <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} dateFormat="dd-MM-yyyy" required />
                        </Box>
                        <Box mt={2}>
                            <label>End Date:</label>
                            <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} dateFormat="dd-MM-yyyy" required />
                        </Box>
                        <Button type="submit" variant="contained" color="primary" style={{ marginTop: '20px' }}>
                            {editMode ? 'Update Holiday' : 'Add Holiday'}
                        </Button>
                    </form>
                </Box>
            </Modal>
            {message && <Typography mt={2} align="center">{message}</Typography>}
        </div>
    );
};

export default HolidayForm;
