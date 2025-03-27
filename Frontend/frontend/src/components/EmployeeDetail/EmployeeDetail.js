import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EditEmployeeModal from '../../components/EditEmployeeModal/EditEmployeeModal';
import './EmployeeDetail.css';
import Axios from 'axios';
import { Button } from '@mui/material';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const EmployeeDetail = ({ departments, getEmployees, locations, employees}) => {
    const [employee, setEmployee] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);

    const navigate = useNavigate();

    const handleEditClick = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleEmployeeUpdated = () => {
        window.location.reload();
    };

    const getEmployee = async () => {
        const response = await Axios.get(`${baseUrl}/employee/${window.location.pathname.split("/")[2]}`);
        setEmployee(response.data);
    };


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

      

    const handleDisable = () => {
        let reason;
        
        while (!reason) {
            reason = window.prompt("You are disabling this user!\nEnter the reason for disable (required):");
            if (reason === null) {
                break;
            }
                reason = reason.trim();
    
            if (reason === "") {
                alert("Please provide a valid reason for disabling the user.");
                reason = null; 
            }
        }
        if (reason !== null) {
            try {
                let employeeId = employee.id;
                let previous_dep = employee.department_id;
                Axios.patch(`${baseUrl}/disable-user`, 
                    { reason, employeeId, previous_dep }, 
                    { 
                        headers: { 
                        Authorization: `Bearer ${getCookie('access_token')}` 
                        }
                    })
                    .then(response => {
                        window.location.reload(); // Reload the page to reflect changes
                    })
                    .catch(error => {
                        console.error("Error disabling employee: ", error);
                    });
            } catch (error) {
                console.error("Error making the request:", error);
            }
        }
    };
    


    useEffect(() => {
        getEmployee();
    }, []);


    return (
        <div className="employee-detail">
            <Button style={{ "marginBottom": "10px" }} variant="contained" onClick={() => navigate(`/staff`)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/></svg>
            </Button>
            <h1 style={{ "marginBottom": "15px" }}>Employee Detail</h1>
            <table className="employee-detail-table">
                <tbody>
                    <tr>
                        <th>First Name</th>
                        <td>{employee.first_name}</td>
                    </tr>
                    <tr>
                        <th>Last Name</th>
                        <td>{employee.last_name}</td>
                    </tr>
                    <tr>
                        <th>Email</th>
                        <td>{employee.email}</td>
                    </tr>
                    <tr>
                        <th>Days</th>
                        <td>{employee.days}</td>
                    </tr>
                    <tr>
                        <th>Department</th>
                        <td>{employee.department_name}</td>
                    </tr>
                    <tr>
                        <th>Manager</th>
                        <td>{employee.manager_full_name ? `${employee.manager_full_name}` : "None"}</td>
                    </tr>
                    <tr>
                        <th>First Approver</th>
                        <td>{employee.first_approver_full_name ? `${employee.first_approver_full_name}` : "None"}</td>
                    </tr>
                    <tr>
                        <th>Location</th>
                        <td>{employee.location_name}</td>
                    </tr>
                    {employee.disable_reason && 
                    <tr>
                        <th style={{ color: 'red' }}>Disable Reason</th>
                        <td>{employee.disable_reason}</td>
                    </tr>}
                    {employee.previous_department_name &&
                    <tr>
                        <th style={{ color: 'red' }}>Previous Department</th>
                        <td>{employee.previous_department_name}</td>
                    </tr>
                    }
                </tbody>
            </table>
            <Button style={{ "marginRight": "15px" }} variant="contained" color="success" onClick={handleEditClick}>Edit</Button>
            <Button style={{ "marginRight": "15px" }} variant="contained" onClick={() => navigate(`/employee/${employee.id}/leaves`)}>Leaves</Button>
            <Button style={{ "marginRight": "15px" }} variant="contained" color="error" onClick={handleDisable} disabled={employee.disable_reason !== null}>Disable</Button>
            <EditEmployeeModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                employee={employee}
                onEmployeeUpdated={handleEmployeeUpdated}
                departments={departments}
                locations={locations}
                employees={employees}
                isManager={departments.filter(d => d.id === employee.department_id)[0]?.manager_id === employee.id}
            />
        </div>
    );
};

export default EmployeeDetail;




