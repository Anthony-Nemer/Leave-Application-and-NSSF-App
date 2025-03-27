import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './FirstApproverSharedCalendar.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const localizer = momentLocalizer(moment);

const FirstApproverSharedCalendar = ({ token, onClose }) => {
    const [events, setEvents] = useState([]);
    const [calendarOverlay, setCalendarOverlay] = useState(false);
    const [calendarOverlayEvents, setCalendarOverlayEvents] = useState([]);

    useEffect(() => {
        const fetchFirstApproverLeaves = async () => {
            try {
                const response = await Axios.get(`${baseUrl}/first-approver-leaves`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const filteredLeaves = response.data.filter(
                    leave => leave.request_status !== 'Rejected' && leave.request_status !== 'Cancelled' && !leave.request_status.includes('Pending')
                );

                const leaves = filteredLeaves.flatMap(leave => {
                    const leaveDates = leave.leave_date.split(',');
                    return leaveDates.map(date => {
                        let title = `${leave.employee_name} - ${leave.type_of_leave}`;
                        if (leave.duration == 0.5) {
                            title += ` (${leave.time === 'AM' ? 'Morning' : 'Afternoon'})`;
                        } else {
                            title += ` (Full Day)`;
                        }

                        return {
                            key: leave.employee_id + "-" + new Date(date),
                            title,
                            date: moment(date).startOf('day').toDate(),
                            allDay: leave.duration === 1,
                            leaveType: leave.type_of_leave,
                            requestStatus: leave.request_status,
                            duration: leave.duration,
                        };
                    });
                });
                setEvents(leaves);
                console.log(filteredLeaves);
            } catch (error) {
                console.error('Error fetching first approver leaves:', error);
            }
        };
        
        fetchFirstApproverLeaves();
    }, [token]);

    const eventStyleGetter = (event) => {
        let backgroundColor = '#4CAF50';

        if (event.leaveType.includes("Sick Leave")) {
            backgroundColor = 'yellow';
        }
        if (event.requestStatus.includes('Pending')) {
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

    const handleCalendarOverlay = (events) => {
        setCalendarOverlay(true);
        setCalendarOverlayEvents(events);
    };

    const closeOverlay = () => {
        setCalendarOverlay(false);
    };

    return (
        <div style={{ height: '500px', width: '100%', margin: '0 auto', position: 'relative', padding: '15px' }}>
            <button className="close-button" onClick={onClose}>X</button>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="date"
                endAccessor="date"
                views={['month', 'agenda']}
                style={{ height: '500px', width: '100%' }}
                eventPropGetter={eventStyleGetter}
                onShowMore={(events) => handleCalendarOverlay(events)}
                formats={{
                    dateFormat: 'DD/MM/YYYY', // Change to DD/MM/YYYY for the agenda view
                    dayFormat: 'DD/MM/YYYY',
                    agendaDateFormat: 'DD/MM/YYYY', // Use this to change the agenda date format
                    agendaHeaderFormat: ({ start, end }) => 
                            `${moment(start).format('DD/MM/YYYY')} – ${moment(end).format('DD/MM/YYYY')}`
                }}
            />
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

export default FirstApproverSharedCalendar;
