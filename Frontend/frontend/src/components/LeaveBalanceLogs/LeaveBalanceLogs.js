import React, {useState, useEffect} from "react";
import Axios from "axios";
import { DataGrid } from '@mui/x-data-grid'
import './LeaveBalanceLogs.css'

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const LeaveBalanceLogs = ({ token }) => {
    const [logs, setLogs] = useState([]);

    useEffect(()=>{
        const fetchLogs = async () => {
            try{
                const response = await Axios.get(`${baseUrl}/leave-balance-logs`,{
                    headers: {Authorization:`Bearer ${token}`},
                })
                setLogs(response.data.map(log =>({
                    ...log, 
                    employee_name:`${log.first_name} ${log.last_name}`,
                    timestamp_edited: new Date(log.log_date).toLocaleString("en-US", options),
                })));
            }catch(error){
                console.error('Error fetching leave balance logs:',error)
            }
        }

        fetchLogs()
    }, [token])

    const options = {
        year: 'numeric',
        month: 'long',
        day:'numeric',
        hour:'numeric',
        minute:'numeric',
        second:'numeric',
        hour12: true,
        timeZone: 'Etc/GMT-3',
    }
    console.log("dnodnd   "+logs)

    return(
        <div className="leave-balance-logs-container">
            <h1>Leave Balance Logs</h1>
            <div className="leave-balance-logs-table-container">
                <DataGrid 
                    rows={logs}
                    columns={[
                        { field: 'id', headerName: 'ID', flex:0.5},
                        { field: 'employee_name', headerName: 'Employee Name', flex:1.5},
                        { field: 'balance_before', headerName: 'Balance Before', flex:1},
                        { field: 'balance_after', headerName: 'Balance After', flex:1},
                        { field: 'timestamp_edited', headerName: 'Log Date', flex:1.5},
                    ]}
                    pageSize={10}
                    autoHeight
                />
            </div>
        </div>
    )
}

export default LeaveBalanceLogs;