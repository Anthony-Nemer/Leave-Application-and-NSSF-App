import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './SharedCalendar.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const localizer = momentLocalizer(moment);

const SharedCalendar = ({ token, onClose }) => {
    const [events, setEvents] = useState([]);
    const [calendarOverlay, setCalendarOverlay] = useState(false);
    const [calendarOverlayEvents, setCalendarOverlayEvents] = useState([]);

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
        const fetchDepartmentLeaves = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/department-leaves`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const filteredLeaves = response.data.filter(
                    leave => leave.request_status !== 'Rejected' && leave.request_status !== 'Cancelled'
                );

                // Flatten the leave dates to separate events for each date
                const leaves = filteredLeaves.flatMap(leave => {
                    const leaveDates = leave.leave_date.split(','); // Assuming leave.leave_date is a comma-separated string of dates
                    return leaveDates.map(date => {
                        const leaveType = leaveTypeAbbreviations[leave.type_of_leave] || leave.type_of_leave
                        let title = `${leave.employee_name}-${leaveType}`;
                        if (leave.duration == 0.5) {
                            title += ` (${leave.time === 'AM' ? 'AM' : 'PM'})`;
                        } else {
                            title += `(1)`;
                        }

                        return {
                            key: leave.employee_id + "-" + new Date(date),
                            title,
                            // start: new Date(date).toISOString().split('T')[0],
                            date: moment(date).startOf('day').toDate(),
                            allDay: leave.duration === 1,
                            leaveType: leave.type_of_leave,
                            requestStatus: leave.request_status,
                            duration: leave.duration,
                        };
                    });
                });
                console.log(leaves);
                setEvents(leaves);
            } catch (error) {
                console.error('Error fetching department leaves:', error);
            }
        };

        fetchDepartmentLeaves();
    }, [token]);

    const eventStyleGetter = (event, start, end, isSelected) => {

        let backgroundColor = '#4CAF50';

        console.log(event)
        
        if(event.leaveType.includes("Sick Leave")){
            backgroundColor = 'yellow'
        }
        if (event.requestStatus === 'Pending Manager') {
            backgroundColor = 'lightgrey';
        }
        const style = {
            backgroundColor,
            opacity: 0.8,
            color: 'black',
            border: '0px',
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
        <div style={{ height: 'calc(100vh - 200px)', width: '100%', margin: '0 auto', position: 'relative', padding: '15px'  }}>
            <button className="close-button" onClick={onClose}>X</button>
            <div className='calendar-with-legend'>
                <div className='calendar-container'>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="date"
                        endAccessor="date"
                        onSelectEvent={e => console.log(e)}
                        views={['month', 'agenda']}
                        style={{ height: 'calc(100vh - 200px)', width: '100%' }}
                        eventPropGetter={eventStyleGetter}
                        onShowMore={(events, date) => handleCalendarOverlay(events, date)}
                        formats={{
                            dateFormat: 'DD/MM/YYYY', // Change to DD/MM/YYYY for the agenda view
                            dayFormat: 'DD/MM/YYYY',
                            agendaDateFormat: 'DD/MM/YYYY', // Use this to change the agenda date format
                            agendaHeaderFormat: ({ start, end }) => // 🟢 Fix date range format
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
                    <ul className='calendar-overlay__list'>
                        <button className="overlay-close-button" onClick={closeOverlay}>X</button>
                        <h2>{calendarOverlayEvents[0].date}</h2>
                        {calendarOverlayEvents.map((e) => (
                            <li key={e.key}>{e.title}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SharedCalendar;
