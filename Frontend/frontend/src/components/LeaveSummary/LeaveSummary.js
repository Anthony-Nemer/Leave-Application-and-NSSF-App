import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import moment from 'moment';
import './LeaveSummary.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const LeaveSummary = ({ employeeId }) => {
    const [leaveSummary, setLeaveSummary] = useState([]);
    const [gridData, setGridData] = useState({});
    const [employeeInfo, setEmployeeInfo] = useState({});
    const [totals, setTotals] = useState({});
    const [totalSickLeavesWithMedicalReport, setTotalSickLeavesWithMedicalReport] = useState(0);
    const [totalSickLeavesAllowed, setTotalSickLeavesAllowed] = useState(0);
    const [totalUnpaidLeaves, setTotalUnpaidLeaves] = useState(0);
    const [totalPTO, setTotalPTO] = useState(0);
    const [daysToBeConsumedBy, setDaysToBeConsumedBy] = useState(0);
    const [startingBalance, setStartingBalance] = useState(null);


    useEffect(() => {
        const fetchData = async () => {
            try{
                const [leaveSummaryResponse, employeeInfoResponse, startingBalanceResponse] = await Promise.all([
                    Axios.get(`${baseUrl}/employee/${employeeId}/leave-summary`),
                    Axios.get(`${baseUrl}/employee/${employeeId}`),
                    Axios.get(`${baseUrl}/employee/${employeeId}/starting-balance`)
                ]);
                const leaveData = leaveSummaryResponse.data
                const employeeData = employeeInfoResponse.data

                setLeaveSummary(leaveData)
                setStartingBalance(startingBalanceResponse.data.startingBalance)

                
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

                const totalDaysUsed = calculateDaysUsed(leaveData)

                setEmployeeInfo({
                    ...employeeData,
                    daysUsed: totalDaysUsed
                })
            } catch(error){
                console.error('Error fetching data:', error)
            }
        }
        fetchData()
    }, [employeeId])
    const calculateDaysUsed = (leaveSummaryData) => {
        let totalDaysUsed = 0

        leaveSummaryData.forEach(leave => {
            const leaveType = leave.leave_type;
            let duration = Math.abs(parseFloat(leave.net_amount)) || 0;
            
            if (leaveType === 'Annual Paid Leave' || leave.request_status === 'HR Remove' || leaveType === 'Forced Leave') {
                totalDaysUsed += duration;
                
            }
        })

        return totalDaysUsed
    }
    useEffect(() => {
        const generateGridData = () => {
            const data = {};
            const monthTotals = {};
            let totalDaysUsed = 0;
            let sickLeaveDaysWithMedicalReport = 0;
            let sickLeaveDaysAllowed = 0;
            let unpaidLeave = 0;
            let currentMonthPtoMinutes = 0;
            const currentMonth = new Date().getMonth();

            leaveSummary.forEach(leave => {
                const date = new Date(leave.date);
                const month = date.getMonth();
                const day = date.getDate();
                let duration = Math.abs(parseFloat(leave.net_amount)) || 0;
                const leaveType = leave.leave_type;

                if (!data[month]) {
                    data[month] = {};
                }
                if (!monthTotals[month]) {
                    monthTotals[month] = 0;
                }

                if (leaveType === 'Personal Time Off' && leave.time_intervals) {
                    const ptoMinutes = leave.time_intervals.split(',').reduce((total, interval) => {
                        const [start, end] = interval.trim().split(' - ');
                        const startTime = moment(`1970-01-01 ${start}`, "YYYY-MM-DD HH:mm:ss");
                        const endTime = moment(`1970-01-01 ${end}`, "YYYY-MM-DD HH:mm:ss");
                        const minutes = endTime.diff(startTime, 'minutes');
                        return total + minutes;
                    }, 0);

                    if (month === currentMonth) {
                        currentMonthPtoMinutes += ptoMinutes;
                    }

                    duration = `${ptoMinutes}min`;
                    data[month][day] = { duration, leaveType: 'Personal Time Off' };
                } else {

                    
                    if (leaveType === 'Annual Paid Leave' || leave.request_status === 'HR Remove' || leaveType === 'Forced Leave') {
                        monthTotals[month] += duration;
                        totalDaysUsed += duration;
                        
                    }
                    
                    if(leaveType === "Sick Leave Allowed"){
                        duration = duration === 1 ? '1SLA' : '0.5SLA'
                    }
                    if(leaveType === "Sick Leave With Medical Report"){
                        duration = duration === 1 ? '1SLR' : '0.5SLR'
                    }
                    if(leaveType === "Forced Leave"){
                        duration = duration === 1 ? '1FL' : '0.5FL'
                    }
                    if(leaveType === 'Compassionate'){
                        duration = 'CL'
                    }
                    if(leaveType === 'Marital'){
                        duration = 'MRL'
                    }
                    if(leaveType === 'Maternity'){
                        duration = 'MTL'
                    }
                    if(leaveType === 'Paternity'){
                        duration = 'PTL'
                    }
                    if(leaveType === 'Unpaid Leave'){
                        duration = duration === 1 ? '1UL' : '0.5UL'
                    }
                    data[month][day] = { duration, leaveType };


                    if (leaveType === 'Sick Leave With Medical Report') {
                        sickLeaveDaysWithMedicalReport += duration === '1SLR' ? 1 : duration === '0.5SLR' ? 0.5 : duration;
                    }
                    if (leaveType === 'Sick Leave Allowed') {
                        sickLeaveDaysAllowed += duration === '1SLA' ? 1 : duration === '0.5SLA' ? 0.5 : duration;
                    }
                    if (leaveType === 'Unpaid Leave') {
                        unpaidLeave += duration === '1UL' ? 1 : duration === '0.5UL' ? 0.5 : duration;
                    }
                }
            });

            setGridData(data);
            setTotals(monthTotals);
            setTotalSickLeavesWithMedicalReport(sickLeaveDaysWithMedicalReport);
            setTotalSickLeavesAllowed(sickLeaveDaysAllowed);
            setTotalUnpaidLeaves(unpaidLeave);
            setTotalPTO(currentMonthPtoMinutes);
            setEmployeeInfo(prev => {
                const updatedInfo = { ...prev, daysUsed: totalDaysUsed };
                return updatedInfo
            })
        };

        generateGridData()
    }, [leaveSummary])

    const renderGrid = () => {
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        return (
            <table className="leave-summary-table">
                <thead>
                    <tr>
                        <th></th>
                        {months.map((month, index) => (
                            <th key={index}>{month}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: 31 }, (_, i) => (
                        <tr key={i}>
                            <td>{i + 1}</td>
                            {months.map((_, monthIndex) => (
                                // <td key={monthIndex}>
                                //     {gridData[monthIndex] && gridData[monthIndex][i + 1]
                                //         ? (
                                //             <span className={gridData[monthIndex][i + 1].leaveType.includes('Sick Leave') ? 'sick-leave' : ''}>
                                //                 {gridData[monthIndex][i + 1].leaveType === 'Personal Time Off' ? gridData[monthIndex][i + 1].duration : gridData[monthIndex][i + 1].duration}
                                //             </span>
                                //         ) : ""}
                                // </td>
                                <td key={monthIndex}>
                                    {gridData[monthIndex] && gridData[monthIndex][i + 1] ? (
                                        (() => {
                                            let className = '';
                                            const leaveType = gridData[monthIndex][i + 1].leaveType;

                                            if (leaveType.includes('Sick Leave')) {
                                                className = 'sick-leave';
                                            } else if (['Compassionate', 'Marital', 'Maternity', 'Paternity'].includes(leaveType)) {
                                                className = 'other-leave';
                                            } else if (leaveType === 'Personal Time Off') {
                                                className = 'pto-leave';
                                            }

                                            return (
                                                <span className={className}>
                                                    {gridData[monthIndex][i + 1].duration}
                                                </span>
                                            );
                                        })()
                                    ) : ""}
                                </td>
                            ))}
                        </tr>
                    ))}
                    <tr>
                        <td><b>Total</b></td>
                        {months.map((_, monthIndex) => (
                            <td key={monthIndex}>
                                <b>{totals[monthIndex] ? totals[monthIndex].toFixed(1) : 0}</b>
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        );
    };
    //console.log(startingBalance);
    return (
        <div className="leave-summary">
            <h2>Leave Summary</h2>
            <div className="employee-info">
                <div className='intro-left'>
                    <p><b>Name: </b>{employeeInfo.first_name} {employeeInfo.last_name}</p>
                    <p><b>Employee ID: </b>{employeeInfo.id}</p>
                    <p><b>Days Added on Jan1: </b>{employeeInfo.leave_days_on_jan_1}</p>
                    {startingBalance && (
                        <p><b>Starting Balance: </b>{startingBalance}</p>
                    )}
                    <p><b>Remaining Balance: </b>{employeeInfo.days}</p>
                    {daysToBeConsumedBy > 0 && (
                    <p><b>Days to be consumed: </b>{daysToBeConsumedBy}</p>
                    )}
                </div>
                <div className='into-right'>
                    <p><b>Leaves Used: </b>{employeeInfo.daysUsed}</p>
                    <p><b className="sick-leave">Sick Leaves With Medical Report (SLR): </b><span className="sick-leave">{totalSickLeavesWithMedicalReport}</span></p>
                    <p><b className="sick-leave">Sick Leaves Allowed (SLA): </b><span className="sick-leave">{totalSickLeavesAllowed}</span></p>
                    <p><b className="unpaid-leave">Unpaid Leaves (UL): </b><span className="unpaid-leave">{totalUnpaidLeaves}</span></p>
                    <p><b className="pto-leave">Personal Time Off: </b><span className="pto-leave">{totalPTO} minutes</span></p>
                </div>
            </div>
            {renderGrid()}
        </div>
    );
};

export default LeaveSummary;

