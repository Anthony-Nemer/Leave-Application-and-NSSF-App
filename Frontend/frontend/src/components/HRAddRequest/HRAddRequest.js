import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import DatePicker, { Calendar } from 'react-multi-date-picker';
import 'react-multi-date-picker/styles/colors/teal.css';
import 'react-multi-date-picker/styles/layouts/prime.css';
import './HRAddRequest.css';
import moment from 'moment';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const HRAddRequest = ({ isOpen, onClose, employeeId, refreshData, token }) => {
    const [requestType] = useState('Leave Request');
    const [typeOfLeave, setTypeOfLeave] = useState('');
    const [leaveDetails, setLeaveDetails] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [holidayDates, setHolidayDates] = useState([]);
    const [employeeInfo, setEmployeeInfo] = useState([]);


    useEffect(() => {
        const getUnavailableDates = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/unavailable-dates/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Unavailable Dates:', response.data);
                setUnavailableDates(response.data);
            } catch (error) {
                console.error('Error fetching unavailable dates:', error);
            }
        };

        const getHolidays = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/holidays`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Holiday Dates:', response.data);
                setHolidayDates(response.data.map(holiday => ({
                    start: moment(holiday.start_date).format('YYYY-MM-DD'),
                    end: moment(holiday.end_date).format('YYYY-MM-DD')
                })));
            } catch (error) {
                console.error('Error fetching holidays:', error);
            }
        };

        getUnavailableDates();
        getHolidays();
    }, [employeeId, token]);

    useEffect(() => {
        const updatedLeaveDetails = selectedDates.map(date => {
            const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
            const existing = leaveDetails.find(detail => detail.date === formattedDate);
            return existing ? existing : { date: formattedDate, duration: '', time: '', start_time: '', end_time: '' };
        });
        setLeaveDetails(updatedLeaveDetails);
    }, [selectedDates]);

    
    const handleDurationChange = (date, duration) => {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        if (
            getUnavailableActions(formattedDate).includes('NONE') ||
            (getUnavailableActions(formattedDate).includes('HD-PM') && duration === '1') ||
            (getUnavailableActions(formattedDate).includes('HD-AM') && duration === '1')
        ) {
            alert("Action Not Allowed");
            return;
        }
        setLeaveDetails(leaveDetails.map(detail =>
            detail.date === formattedDate ? { ...detail, duration } : detail
        ));
    };

    const handleTimeChange = (date, time) => {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        if (
            getUnavailableActions(formattedDate).includes('NONE') ||
            (getUnavailableActions(formattedDate).includes('HD-PM') && time === 'PM') ||
            (getUnavailableActions(formattedDate).includes('HD-AM') && time === 'AM')
        ) {
            alert("Action Not Allowed");
            return;
        }
        setLeaveDetails(leaveDetails.map(detail =>
            detail.date === formattedDate ? { ...detail, time } : detail
        ));
    };

    const handleStartTimeChange = (date, start_time) => {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        setLeaveDetails(leaveDetails.map(detail =>
            detail.date === formattedDate ? { ...detail, start_time } : detail
        ));
    };

    const handleEndTimeChange = (date, end_time) => {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        setLeaveDetails(leaveDetails.map(detail =>
            detail.date === formattedDate ? { ...detail, end_time } : detail
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (typeOfLeave === '') {
            alert('Please select a leave type before submitting.');
            return;
        }

        const quantity = leaveDetails.reduce((total, detail) => {
            const duration = parseFloat(detail.duration);
            return !isNaN(duration) ? total + duration : total;
        }, 0);

        const req = {
            employeeId,
            typeOfLeave,
            quantity,
            leaveDetails
        };
        try {
            await Axios.post(`${baseUrl}/leave-requests/hr`, req, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeaveDetails([]);
            onClose();
            refreshData();
            setTypeOfLeave('')
        } catch (error) {
            console.error('Error submitting leave transaction:', error);
        }

    };

    const getDayClass = (date) => {
        const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
        const detail = leaveDetails.find(detail => detail.date === formattedDate);
        const className = detail ? (detail.duration === '1' ? 'full-day' : ((detail.duration === '0.5' && detail.time !== '') ? (detail.time === 'AM' ? 'half-day half-day-morning' : 'half-day half-day-afternoon') : '')) : '';
        return className;
    };

    const isHoliday = (date) => {
        const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
        return holidayDates.some(holiday => formattedDate >= holiday.start && formattedDate <= holiday.end);
    };

    const getExistingLeaveClass = (date) => {
        var UDs = unavailableDates.filter(ud => ud.date.split("T")[0] === moment(date.toDate()).format('YYYY-MM-DD'));
        return UDs.map(ud => ud.action).join(' ');
    };

    const isDisabled = (date) => {
        const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
        return isHoliday(date); // No need to check if it's a weekend anymore
    };
    

    const getUnavailableActions = (date) => {
        const UDs = unavailableDates.filter(ud => ud.date.split("T")[0] === date);
        return UDs.map(ud => ud.action);
    };

    const getDayOptions = (formattedDate) => {
        const ud = unavailableDates.find(ud => ud.date.split("T")[0] === formattedDate);
        if (!ud) return { disableFullDay: false, disableHalfDay: typeOfLeave === 'Marital' || typeOfLeave === 'Maternity' || typeOfLeave === 'Paternity'
            , disableAM: false, disablePM: false };
        
        switch (ud.action) {
            case 'NONE':
                return { disableFullDay: true, disableHalfDay: true, disableAM: true, disablePM: true };
            case 'HD-AM':
                return { disableFullDay: true, disableHalfDay: false, disableAM: true, disablePM: false };
            case 'HD-PM':
                return { disableFullDay: true, disableHalfDay: false, disableAM: false, disablePM: true };
            case 'PTO':
                return { disableFullDay: false, disableHalfDay: false, disableAM: false, disablePM: false};
            default:
                return { disableFullDay: false, disableHalfDay: false, disableAM: false, disablePM: false };
        }
    };

    const handleTypeOfLeaveChange = (e) => {
        const selectedType = e.target.value;
    

        setTypeOfLeave(selectedType);
    
        // If a special leave type is selected and dates are chosen
        if (selectedType === 'Marital' || selectedType === 'Maternity' || selectedType === 'Paternity') {            
            setSelectedDates([]);
            setLeaveDetails([]);
        }
    };
    
    

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal lr-modal">
                <button className="close-button" onClick={onClose}>X</button>
                <h2>Add Leave Request</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Request Type:</label>
                        <input type="text" value={requestType} readOnly />
                    </div>
                    <div className="form-group">
                        <label>Type of Leave:</label>
                        <select value={typeOfLeave} onChange={handleTypeOfLeaveChange} required>
                            <option value="">Select Type</option>
                            <option value="Condolences">Compassionate</option>
                            <option value="Maternity">Maternity</option>
                            <option value="Paternity">Paternity</option>
                            <option value="Marital">Marital</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Dates:</label>
                        <Calendar
                            multiple
                            value={selectedDates}
                            onChange={setSelectedDates}
                            format="YYYY-MM-DD"
                            className="teal prime"
                            arrowLeft="←"
                            arrowRight="→"
                            disabled={typeOfLeave === ''}
                            mapDays={({ date }) => {
                                const formattedDate = moment(date.toDate()).format('YYYY-MM-DD');
                                const dayOptions = getDayOptions(formattedDate);
                                const className = ` ${getExistingLeaveClass(date)} ${getDayClass(date)}`;
                                return {
                                    disabled: isDisabled(date),
                                    className: className
                                };
                            }}
                        />
                    </div>
                    {leaveDetails.map((detail, index) => {
                        const dayOptions = getDayOptions(detail.date);
                        return (
                            <div key={`${detail.date}-${index}`} className="form-group">
                                {typeOfLeave === 'Personal Time Off' ? (
                                    <>
                                        <div className="form-group">
                                            <label>{detail.date} Start Time:</label>
                                            <input type="time" value={detail.start_time} onChange={(e) => handleStartTimeChange(detail.date, e.target.value)} required={detail.duration !== '1'} disabled={detail.duration === '1'} />
                                        </div>
                                        <div className="form-group">
                                            <label>{detail.date} End Time:</label>
                                            <input type="time" value={detail.end_time} onChange={(e) => handleEndTimeChange(detail.date, e.target.value)} required={detail.duration !== '1'} disabled={detail.duration === '1'} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label>{detail.date} Duration:</label>
                                        <select 
                                            value={detail.duration} 
                                            onChange={(e) => handleDurationChange(detail.date, e.target.value)} 
                                            required 
                                            disabled={dayOptions.disableFullDay && dayOptions.disableHalfDay}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="1" disabled={dayOptions.disableFullDay}>Full Day</option>
                                            <option value="0.5" disabled={dayOptions.disableHalfDay}>Half Day</option>
                                        </select>
                                        {detail.duration === '0.5' && (
                                            <div className="form-group">
                                                <label>{detail.date} Time:</label>
                                                <select 
                                                    value={detail.time} 
                                                    onChange={(e) => handleTimeChange(detail.date, e.target.value)} 
                                                    required
                                                    disabled={dayOptions.disableAM && dayOptions.disablePM}
                                                >
                                                    <option value="">Select Time</option>
                                                    <option value="AM" disabled={dayOptions.disableAM}>Morning</option>
                                                    <option value="PM" disabled={dayOptions.disablePM}>Afternoon</option>
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                    <button type="submit" className="submit-button">Add Leave Request</button>
                </form>
            </div>
        </div>
    );

}

export default HRAddRequest;
