import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BankEditEmployeeModal from '../../components/BankEditEmployeeModal/BankEditEmployeeModal';
import './BankEmployeeDetail.css';
import Axios from 'axios';
import { Button } from '@mui/material';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const BankEmployeeDetail = ({ bankEmployees, getBankEmployees, bankLocations, bankCompanies, bankRelations, pureBankEmployees}) => {
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



    const getBankEmployee = async () => {
        const response = await Axios.get(`${baseUrl}/bankEmployee/${window.location.pathname.split("/")[2]}`);
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


    


    useEffect(() => {
        getBankEmployee();
    }, []);


    return (
        <div className="employee-detail">
            <Button style={{ "marginBottom": "10px" }} variant="contained" onClick={() => navigate(`/bank-staff`)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/></svg>
            </Button>
            <h1 style={{ "marginBottom": "15px" }}>Bank Employee Details</h1>
            <table className="employee-detail-table">
                <tbody>
                    <tr>
                        <th>First Name - En</th>
                        <td>{employee.first_name_en}</td>
                    </tr>                    
                    <tr>
                        <th>Middle Name - En</th>
                        <td>{employee.middle_name_en}</td>
                    </tr>
                    <tr>
                        <th>Last Name - En</th>
                        <td>{employee.last_name_en}</td>
                    </tr>
                    <tr>
                        <th>First Name - Ar</th>
                        <td>{employee.first_name_ar}</td>
                    </tr>                    
                    <tr>
                        <th>Middle Name - Ar</th>
                        <td>{employee.middle_name_ar}</td>
                    </tr>
                    <tr>
                        <th>Last Name - Ar</th>
                        <td>{employee.last_name_ar}</td>
                    </tr>
                    <tr>
                        <th>Date of Birth</th>
                        <td>{new Date(employee.date_of_birth).toLocaleDateString('en-GB')}</td>
                    </tr>
                    <tr>
                        <th>Relation</th>
                        <td>{employee.relation}</td>
                    </tr>
                    <tr>
                        <th>Related To</th>
                        <td>{employee.related_to_full_name ? `${employee.related_to_full_name}` : "None"}</td>
                    </tr>
                    <tr>
                        <th>NSSF No.</th>
                        <td>{employee.nssf_no}</td>
                    </tr>
                    <tr>
                        <th>Bank Pin</th>
                        <td>{employee.bank_pin}</td>
                    </tr>
                    <tr>
                        <th>Location</th>
                        <td>{employee.branch_location}</td>
                    </tr>
                    <tr>
                        <th>Company</th>
                        <td>{employee.company_name}</td>
                    </tr>
        
                    
                </tbody>
            </table>
            <Button style={{ "marginRight": "15px" }} variant="contained" color="success" onClick={handleEditClick}>Edit</Button>
            <BankEditEmployeeModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                employee={employee}
                bankEmployees ={bankEmployees}
                onEmployeeUpdated={handleEmployeeUpdated}
                bankLocations = {bankLocations}
                bankCompanies = {bankCompanies}
                bankRelations= {bankRelations}
                pureBankEmployees={pureBankEmployees}
            />
        </div>
    );
};

export default BankEmployeeDetail;




