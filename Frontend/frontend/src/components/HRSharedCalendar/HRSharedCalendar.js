import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './HRSharedCalendar.css';

const localizer = momentLocalizer(moment);
const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const HRSharedCalendar = ({ token, onClose }) => {
    const [events, setEvents] = useState([]);
    const [calendarOverlay, setCalendarOverlay] = useState(false);
    const [calendarOverlayEvents, setCalendarOverlayEvents] = useState([]);
    const [departments, setDepartments] = useState([])
    const [selectedDepartment, setSelectedDepartment] = useState('')

    const leaveTypeAbbreviations = {
        'Annual Paid Leave': 'AL',
        'Sick Leave Allowed': 'SLA',
        'Sick Leave With Medical Report': 'SLR',
        'Unpaid Leave': 'UL',
        'Maternity': 'MTL',
        'Paternity': 'PTL',
        'Marital': 'MRL',
        'Compassionate': 'CL',
        'Forced Leave': 'FL',
        'Personal Time Off': 'PTO',
    }

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/departments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setDepartments(response.data);
            } catch (error) {
                console.error('Error fetching departments:', error);
            }
        };

        fetchDepartments();
    }, [token]);






    useEffect(() => {
        const fetchAllLeaves = async (departmentId) => {
            try {
                let response;
        
                if(departmentId){
                    response = await Axios.get(`${baseUrl}/department-leaves/${departmentId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                } else {
                    response = await Axios.get(`${baseUrl}/all-department-leaves`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                }
        
                const filteredLeaves = response.data.filter(
                    leave => leave.request_status === 'Approved'
                );
        
                const leaves = filteredLeaves.flatMap(leave => {
                    const leaveDates = leave.leave_date.split(',');
                    return leaveDates.map(date => {
                        const leaveType = leaveTypeAbbreviations[leave.type_of_leave] || leave.type_of_leave;
                        let title = `${leave.employee_name}-${leaveType}`;
                        if (leave.duration == 0.5) {
                            title += ` (${leave.time === 'AM' ? 'AM' : 'PM'})`;
                        } else {
                            title += `(1)`;
                        }
        
                        const leaveMoment = moment(date);
        
                        // Remove the month restriction
                        const startDate = leaveMoment.startOf('day').toDate();
                        let endDate = leaveMoment.endOf('day').toDate();
        
                        if (leave.duration > 1) {
                            endDate = leaveMoment.add(leave.duration - 1, 'days').endOf('day').toDate();
                        }
        
                        return {
                            key: leave.employee_id + "-" + new Date(date),
                            title,
                            start: moment(startDate).startOf('day').toDate(),
                            end: moment(endDate).startOf('day').toDate(),
                            date: moment(startDate).startOf('day').toDate(),
                            allDay: leave.duration === 1,
                            leaveType: leave.type_of_leave,
                            requestStatus: leave.request_status,
                            duration: leave.duration,
                        };
                    });
                });
        
                setEvents(leaves);
            } catch (error) {
                console.error('Error fetching all leaves:', error);
            }
        };
        
    
        fetchAllLeaves(selectedDepartment);
    }, [token, selectedDepartment]);
    

    const handleDepartmentChange = (event) => {
        setSelectedDepartment(event.target.value)
    }


    const eventStyleGetter = (event, start, end, isSelected) => {
        let backgroundColor = '#4CAF50';
        if(event.leaveType.includes("Sick Leave")){
            backgroundColor = 'yellow'
        }
        if (event.requestStatus === 'Pending Manager') {
            backgroundColor = 'lightgrey';
        }
        const style = {
            backgroundColor,
            borderRadius: '8px',
            opacity: 0.8,
            color: 'black',
            border: '0px',
            display: 'block',
        };
        return {
            style,
        };
    };

    const handleCalendarOverlay = (events, date) => {
        setCalendarOverlay(true);
        setCalendarOverlayEvents(events);
    };

    const closeOverlay = () => {
        setCalendarOverlay(false);
    };

    return (
        <div style={{ height: 'calc(100vh - 100px)', width: '100%', margin: '0 auto', position: 'relative' }}>
            <div className='calendar__header'>
                <label htmlFor="department-select">Filter by Department</label>
                <select 
                    id='department-select'
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                >
                    <option value=''>All Departments</option>
                    {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                            {department.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className='calendar-with-legend'>
                <div className='calendar-container'>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        views={['month', 'agenda']}
                        defaultDate={new Date()} // Force default view to the current month
                        style={{ height: 'calc(100vh - 200px)', width: '100%' }}
                        eventPropGetter={eventStyleGetter}
                        onShowMore={(events, date) => handleCalendarOverlay(events, date)}
                        formats={{
                            dateFormat: 'DD/MM/YYYY', // Change to DD/MM/YYYY for the agenda view
                            dayFormat: 'DD/MM/YYYY',
                            agendaDateFormat: 'DD/MM/YYYY', // Use this to change the agenda date format
                            agendaHeaderFormat: ({ start, end }) =>
                                    `${moment(start).format('DD/MM/YYYY')} – ${moment(end).format('DD/MM/YYYY')}`
                        }}
                    />

                </div>
                <div className='legend'>
                    <h4>Legend</h4>
                    <ul>
                        <li className='legend-list-items'>AL: Annual Paid Leave</li>
                        <li className='legend-list-items'>SLA: Sick Leave Allowed</li>
                        <li className='legend-list-items'>SLR: Sick Leave With Medical Report</li>
                        <li className='legend-list-items'>PTO: Personal Time Off</li>
                        <li className='legend-list-items'>UL: Unpaid Leave</li>
                        <li className='legend-list-items'>MTL: Maternity Leave</li>
                        <li className='legend-list-items'>PTL: Paternity Leave</li>
                        <li className='legend-list-items'>MRL: Marital Leave</li>
                        <li className='legend-list-items'>CL: Compassionate Leave</li>
                        <li className='legend-list-items'>FL: Forced Leave</li>
                        <li className='legend-list-items'>(1): Full Day</li>
                        <li className='legend-list-items'>(AM): Half-Day Morning</li>
                        <li className='legend-list-items'>(PM): Half-Day Afternoon</li>
                    </ul>
                </div>
            </div>
            {calendarOverlay && (
                <div id="calendar-overlay">
                    <ul className='calender-overlay__list'>
                        <button className="overlay-close-button" onClick={closeOverlay}>X</button>
                        <h2>{moment(calendarOverlayEvents[0].start).format("YYYY-MM-DD")}</h2>
                        {calendarOverlayEvents.map((e, index) => (
                            <li key={e.key}>{e.title}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default HRSharedCalendar;
