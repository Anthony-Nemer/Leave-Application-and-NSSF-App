import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import DatePicker, { Calendar } from 'react-multi-date-picker';
import 'react-multi-date-picker/styles/colors/teal.css';
import 'react-multi-date-picker/styles/layouts/prime.css';
import moment from 'moment';
import './LeaveDaysModal.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const LeaveDaysModal = ({ isOpen, onClose, employeeId, actionType, refreshData, token }) => {
    const [reason, setReason] = useState('');
    const [leaveDetails, setLeaveDetails] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [unavailableDates, setUnavailableDates] = useState([]);

    // useEffect(() => {
    //     const getUnavailableDates = async () => {
    //         try {
    //             const response = await Axios.get(`${baseUrl}/unavailable-dates/${employeeId}`, {
    //                 headers: { Authorization: `Bearer ${token}` }
    //             });
    //             setUnavailableDates(response.data);
    //         } catch (error) {
    //             console.error('Error fetching unavailable dates:', error);
    //         }
    //     };

    //     getUnavailableDates();
    // }, [employeeId, token]);

    useEffect(() => {
        const getUnavailableDates = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/unavailable-dates/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
    
                console.log("Raw unavailable dates from backend:", response.data);
    
                const formattedDates = response.data.map(ud => ({
                    ...ud,
                    date: moment.utc(ud.date).format('YYYY-MM-DD') 
                }));
    
                console.log("Formatted unavailable dates:", formattedDates);
    
                setUnavailableDates(formattedDates);
            } catch (error) {
                console.error('Error fetching unavailable dates:', error);
            }
        };
    
        getUnavailableDates();
    }, [employeeId, token]);
    
    

    // const getUnavailableActions = (date) => {
    //     const UDs = unavailableDates.filter(ud => ud.date.split("T")[0] === date);
    //     return UDs.map(ud => ud.action);
    // };
    
    const getUnavailableActions = (date) => {
        const formattedDate = moment(date).format('YYYY-MM-DD'); // No `.toDate()` needed
        return unavailableDates
            .filter(ud => ud.date === formattedDate)
            .map(ud => ud.action);
    };
    

    useEffect(() => {
        const updatedLeaveDetails = selectedDates.map(date => {
            const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
            const existing = leaveDetails.find(detail => detail.date === formattedDate);
            return existing ? existing : { date: formattedDate, duration: '', time: '' };
        });
        setLeaveDetails(updatedLeaveDetails);
    }, [selectedDates]);

    const handleDurationChange = (date, duration) => {
        if (
            getUnavailableActions(date).includes('NONE') ||
            (getUnavailableActions(date).includes('HD-PM') && duration === '1') ||
            (getUnavailableActions(date).includes('HD-AM') && duration === '1')
        ) {
            alert("Action Not Allowed");
            return;
        }
        setLeaveDetails(leaveDetails.map(detail =>
            detail.date === date ? { ...detail, duration } : detail
        ));
    };

    const handleTimeChange = (date, time) => {
        if (
            getUnavailableActions(date).includes('NONE') ||
            (getUnavailableActions(date).includes('HD-PM') && time === 'PM') ||
            (getUnavailableActions(date).includes('HD-AM') && time === 'AM')
        ) {
            alert("Action Not Allowed");
            return;
        }
        setLeaveDetails(leaveDetails.map(detail =>
            detail.date === date ? { ...detail, time } : detail
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const quantity = leaveDetails.reduce((total, detail) => {
            const duration = parseFloat(detail.duration);
            return !isNaN(duration) ? total + duration : total;
        }, 0);

        const req = {
            employeeId,
            action: actionType,
            reason,
            leaveDetails
        };

        try {
            await Axios.post(`${baseUrl}/leave-requests/hr`, req, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReason('');
            setLeaveDetails([]);
            onClose();
            refreshData();
        } catch (error) {
            console.error('Error submitting leave transaction:', error);
        }
    };

    const getDayClass = (date) => {
        const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
        const detail = leaveDetails.find(detail => detail.date === formattedDate);
        const className = detail ? (detail.duration === '1' ? 'full-day' : (detail.duration === '0.5' && detail.time !== '' ? (detail.time === 'AM' ? 'half-day half-day-morning' : 'half-day half-day-afternoon') : '')) : '';
        return className;
    };

    const getExistingLeaveClass = (date) => {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        return unavailableDates
            .filter(ud => ud.date === formattedDate)
            .map(ud => ud.action)
            .join(' ');
    };
    

    
    // const getExistingLeaveClass = (date) => {
    //     const UDs = unavailableDates.filter(ud => ud.date.split("T")[0] === moment(date.toDate()).format('YYYY-MM-DD'));
    //     return UDs.map(ud => ud.action).join(' ');
    // };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal lr-modal">
                <button className="close-button" onClick={onClose}>X</button>
                <h2>{actionType} Days</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Reason:</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Dates:</label>
                        <Calendar
                            multiple
                            value={selectedDates}
                            onChange={(dates) => {
                                const formattedDates = dates.map(date => moment.utc(date.toDate()).format('YYYY-MM-DD'));
                                console.log("Selected Dates:", formattedDates);
                                setSelectedDates(dates);
                            }}
                                                        format="YYYY-MM-DD"
                            className="teal prime"
                            arrowLeft="←"
                            arrowRight="→"
                            mapDays={({ date }) => {
                                const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
                                const className = `${getDayClass(date)} ${getExistingLeaveClass(date)}`;
                                return {
                                    className: className
                                };
                            }}
                        />
                    </div>
                    {leaveDetails.map((detail, index) => (
                        <div key={`${detail.date}-${index}`} className="form-group">
                            <label>{detail.date} Duration:</label>
                            <select value={detail.duration} onChange={(e) => handleDurationChange(detail.date, e.target.value)} required>
                                <option value="">Select Type</option>
                                <option value="1">Full Day</option>
                                <option value="0.5">Half Day</option>
                            </select>
                            {detail.duration === '0.5' && (
                                <div className="form-group">
                                    <label>{detail.date} Time:</label>
                                    <select value={detail.time} onChange={(e) => handleTimeChange(detail.date, e.target.value)} required>
                                        <option value="">Select Time</option>
                                        <option value="AM">Morning</option>
                                        <option value="PM">Afternoon</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                    <button type="submit" className="submit-button">Submit</button>
                </form>
            </div>
        </div>
    );
};

export default LeaveDaysModal;






