import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import DatePicker, { Calendar } from 'react-multi-date-picker';
import 'react-multi-date-picker/styles/colors/teal.css';
import 'react-multi-date-picker/styles/layouts/prime.css';
import './AddLeaveRequestModal.css';
import moment from 'moment';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const AddLeaveRequestModal = ({ token, isOpen, onClose, onRequestAdded, employees, departments, employeeId, leaveRequests = [], editingRequest }) => {
    const [requestType] = useState('Leave Request');
    const [typeOfLeave, setTypeOfLeave] = useState('');
    const [leaveDetails, setLeaveDetails] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [holidayDates, setHolidayDates] = useState([]);
    const [previousSickLeaveDays, setPreviousSickLeaveDays] = useState(0);
    const [remainingTimeOffMinutes, setRemainingTimeOffMinutes] = useState(120); 
    const [remainingBalance, setRemainingBalance] = useState(0);
    const [previousUnpaidLeaveDays, setPreviousUnpaidLeaveDays] = useState(0);
    const [daysToBeConsumedBy, setDaysToBeConsumedBy] = useState(0);
    const [employeeInfo, setEmployeeInfo] = useState([]);
    const [attachment, setAttachment] = useState(null)

    useEffect(() => {
        const getUnavailableDates = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/unavailable-dates/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                console.log('Unavailable Dates:', response.data);
                
                // Convert the fetched dates to local time before setting the state
                const localizedDates = response.data.map(ud => ({
                    ...ud,
                    date: moment.utc(ud.date).local().format('YYYY-MM-DD') // Convert to local time
                }));
                
                setUnavailableDates(localizedDates); // Set the converted dates in state
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

    useEffect(() => {
        const getPreviousSickLeaveDays = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/previous-sick-leave-days/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPreviousSickLeaveDays(parseFloat(response.data.total) || 0);
            } catch (error) {
                console.error('Error fetching previous sick leave days:', error);
            }
        };

        const getRemainingTimeOff = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/remaining-timeoff/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRemainingTimeOffMinutes(response.data.remainingMinutes);
            } catch (error) {
                console.error('Error fetching remaining time off:', error);
            }
        };

        const getRemainingBalance = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/employee/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const employeeData = response.data
                setEmployeeInfo(employeeData)
                                // Calculate service years
                const startMoment = moment(employeeData.start_date);
                const currentMoment = moment();
                const yearsOfService = currentMoment.diff(startMoment, 'years');
                
                                // Calculate leave days per year based on service years and manager status
                let leaveDaysPerYear = 15;
                if (employeeData.is_manager) {
                    leaveDaysPerYear = 21;
                } else if (yearsOfService >= 15) {
                    leaveDaysPerYear = 21;
                } else if (yearsOfService >= 5) {
                    leaveDaysPerYear = 18;
                }
                
                                // Calculate days to be consumed by June 30
                const daysToBeConsumed = employeeData.days - (leaveDaysPerYear * 2);
                    if (daysToBeConsumed > 0) {
                        setDaysToBeConsumedBy(daysToBeConsumed);
                }
                setRemainingBalance(response.data.days);

            } catch (error) {
                console.error('Error fetching remaining balance:', error);
            }
        };

        const getPreviousUnpaidLeaveDays = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/previous-unpaid-leave-days/${employeeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPreviousUnpaidLeaveDays(parseFloat(response.data.total) || 0);
            } catch (error) {
                console.error('Error fetching previous unpaid leave days:', error);
            }
        };

        getPreviousSickLeaveDays();
        getRemainingTimeOff();
        getRemainingBalance();
        getPreviousUnpaidLeaveDays();
    }, [employeeId, token]);

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

        const totalRequestedSick = parseFloat(previousSickLeaveDays) + quantity;
        const totalRequestedUnpaid = parseFloat(previousUnpaidLeaveDays) + quantity;

        if (typeOfLeave === 'Sick Leave Allowed' && totalRequestedSick > 2) {
            alert('The total days allowed for sick leaves without a medical report has been exceeded, please change request type');
            return;
        }

        if (typeOfLeave === 'Unpaid Leave' && totalRequestedUnpaid > 5) {
            alert('The total days allowed for unpaid leave has been exceeded, please change request type');
            return;
        }

        if (typeOfLeave === 'Personal Time Off') {
            const totalMinutesRequested = leaveDetails.reduce((total, detail) => {
                const startTime = moment(detail.start_time, 'HH:mm');
                const endTime = moment(detail.end_time, 'HH:mm');
                const duration = endTime.diff(startTime, 'minutes');
                return total + duration;
            }, 0);

            if (totalMinutesRequested > remainingTimeOffMinutes) {
                alert('The total hours allowed for this month exceeded, please change request type');
                return;
            }
        }

        const req = {
            employeeId,
            typeOfLeave,
            quantity,
            leaveDetails
        };
        // if(!quantity){
        //     alert("An unexpected error occurred. No dates were selected.");
        //     return;
        // }

        const formData = new FormData();
        formData.append('employeeId', employeeId);
        formData.append('typeOfLeave', typeOfLeave);
        formData.append('quantity', quantity);
        formData.append('leaveDetails', JSON.stringify(leaveDetails));
        if (attachment) {
            formData.append('attachment', attachment); // Add the attachment if available
        }

        try {
            if (editingRequest) {
                const response = await Axios.patch(`${baseUrl}/leave-requests/${editingRequest.id}/edit`, req, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("Leave request update response:", response.data);
            } else {
                const response = await Axios.post(`${baseUrl}/leave-requests`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("Leave request response:", response.data);
            }

            onRequestAdded();
            onClose();
        } catch (error) {
            if(error.response && error.response.data && error.response.data.message){
                alert(`Error: ${error.response.data.message}`)
            }else{
                console.error('Error adding/updating leave request:', error.response ? error.response.data : error.message);
                alert('An unexpected error occurred while processing your request')
            }
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
        // Assuming you want to convert the UTC date to the local time zone
        const localizedDate = moment.utc(ud.date).local().format('YYYY-MM-DD');

        console.log('Unavailable Date 111:', ud); // Log to verify
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
    
        // Check if the selected type is "Unpaid Leave" and if there is a remaining balance
        if (selectedType === 'Unpaid Leave' && remainingBalance > 0) {
            alert('You can only request unpaid leave if your balance is zero.');
            return;
        }
    
        setTypeOfLeave(selectedType);
    
        // If a special leave type is selected and dates are chosen
        if (selectedType === 'Marital' || selectedType === 'Maternity' || selectedType === 'Paternity') {            
            setSelectedDates([]);
            setLeaveDetails([]);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        setAttachment(selectedFile)
    }
    
    

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
                            <option value="Annual Paid Leave">Annual Paid Leave</option>
                            <option value="Sick Leave With Medical Report">Sick Leave With Medical Meport</option>
                            <option value="Unpaid Leave">Unpaid Leave</option>
                            <option value="Sick Leave Allowed">Sick Leave Allowed</option>
                            <option value="Personal Time Off">Personal Time Off</option>
                            <option value="Compassionate">Compassionate</option>
                            <option value="Maternity">Maternity</option>
                            <option value="Paternity">Paternity</option>
                            <option value="Marital">Marital</option>
                        </select>
                    </div>
                    <p className='ptoStatement'>Remaining Personal Time Off (minutes): {remainingTimeOffMinutes}</p>
                    <p>Remaining Sick Leave Allowed (days): {2 - previousSickLeaveDays}</p>
                    {remainingBalance == 0.0 && (
                        <p>Remaining Unpaid Leaves (days): {5 - previousUnpaidLeaveDays}</p>
                    )}
                    {daysToBeConsumedBy > 0 && (
                        <p className='daysToBeConsumed'><b>Days to be consumed: </b>{daysToBeConsumedBy}</p>
                    )}
                    {(typeOfLeave === 'Compassionate' || typeOfLeave === 'Sick Leave With Medical Report') && (
                        <div className='form-group'>
                            <label>Upload Attachment (pdf or image)</label>
                            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} required/>
                        </div>
                    )}
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
};

export default AddLeaveRequestModal;

