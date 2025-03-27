import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import './EditEmployeeModal.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const EditEmployeeModal = ({ isOpen, onClose, employee, onEmployeeUpdated, departments, isManager, locations, employees}) => {
    const [initialEmployeeData, setInitialEmployeeData] = useState({});
    const [id, setId] = useState(null);
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [days, setDays] = useState(0);
    const [departmentName, setDepartmentName] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [department, setDepartment] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationId, setLocationId] = useState(null);
    const [managerId, setManagerId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredManagers, setFilteredManagers] = useState([]);
    const [firstApproverId, setFirstApproverId] = useState(null);
    const [searchTermFirstApprover, setSearchTermFirstApprover]=useState('')
    const [filteredFirstApprovers, setFilteredFirstApprovers]=useState([])
    

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
        if (employee) {
            const initialData = {
                id:employee.id,
                firstName: employee.first_name,
                middleName: employee.middle_name,
                lastName: employee.last_name,
                email: employee.email,
                days: employee.days,
                departmentName: employee.department_name,
                departmentId: departments.filter(d => d.name === employee.department_name)[0]?.id,
                locationName: employee.location_name,
                managerId: employee.manager_id,
                managerName:employee.manager_full_name,
                firstApproverId: employee.first_approver_id,
                firstApproverName: employee.first_approver_full_name
            };

            setInitialEmployeeData(initialData);
            setId(initialData.id)
            setFirstName(initialData.firstName);
            setMiddleName(initialData.middleName);
            setLastName(initialData.lastName);
            setEmail(initialData.email);
            setDays(initialData.days)
            setDepartmentName(initialData.departmentName);
            setDepartmentId(initialData.departmentId);
            setDepartment(departments.filter(d => d.name === employee.department_name)[0]);
            setLocation(initialData.locationName);
            setLocationId(locations?.filter(loc => loc.location_name == initialData.locationName)[0]?.id)
            setManagerId(initialData.managerId)
            setSearchTerm(initialData.managerName || "None")
            setFirstApproverId(initialData.firstApproverId)
            setSearchTermFirstApprover(initialData.firstApproverName || "None")
        }
    }, [employee, departments, locations]);


    function changeDepartment(id) {
        setDepartmentId(id);
        setDepartment(departments.filter(d => d.id === id)[0]);
    }


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updatedEmployee = {
                id,
                firstName,
                middleName,
                lastName,
                email,
                days,
                departmentId,
                managerId,
                firstApproverId,
                locationId
            };
            await Axios.patch(`${baseUrl}/employee/${employee.id}`, updatedEmployee, {
                headers: { Authorization: `Bearer ${getCookie('access_token')}` }
            });
            onEmployeeUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating employee:', error);
        }
    };

    const filterFirstApprovers = (e) => {
        setSearchTermFirstApprover(e.target.value)
        const filtered = employees.filter(emp => 
            emp.first_name.toLowerCase().includes(e.target.value.toLowerCase()) || 
            emp.last_name.toLowerCase().includes(e.target.value.toLowerCase())
        )
        setFilteredFirstApprovers(filtered)
    }
    const handleFirstApproverSelect = (approver) => {
        if(approver===null){
            setFirstApproverId(null)
            setSearchTermFirstApprover("None")
            setFilteredFirstApprovers([])
        }else{
            setFirstApproverId(approver.id)
            setSearchTermFirstApprover(`${approver.first_name} ${approver.last_name}`)
            setFilteredFirstApprovers([])
        }
    }

    const filterManagers = (e) => {
        setSearchTerm(e.target.value)
        const filtered = employees.filter(emp => 
            emp.first_name.toLowerCase().includes(e.target.value.toLowerCase()) || 
            emp.last_name.toLowerCase().includes(e.target.value.toLowerCase())
        )
        setFilteredManagers(filtered)
    }

    const handleManagerSelect = (manager) => {
        if(manager===null){
            setManagerId(null)
            setSearchTerm("None")
            setFilteredManagers([])
        }else{
            setManagerId(manager.id)
            setSearchTerm(`${manager.first_name} ${manager.last_name}`)
            setFilteredManagers([])
        }
    }

    const handleClose = () => {
        setFirstName(initialEmployeeData.firstName);
        setMiddleName(initialEmployeeData.middleName);
        setLastName(initialEmployeeData.lastName);
        setEmail(initialEmployeeData.email);
        setDays(initialEmployeeData.days)
        setDepartmentName(initialEmployeeData.departmentName);
        setDepartmentId(initialEmployeeData.departmentId);
        setManagerId(initialEmployeeData.managerId);
        setFirstApproverId(initialEmployeeData.firstApproverId)
        onClose();
    };


    const changeLocation = (id) => {
        console.log("Location ID: ", id)
        setLocationId(id)
        const selectedLocation = locations.find(loc => loc.id == id);
        console.log(selectedLocation)
        setLocation(selectedLocation.location_name);
    }


    if (!isOpen) return null;
    
    return (
        <div className="modal-overlay">
            <div className="modal">
                <button className="close-button" onClick={handleClose}>X</button>
                <h2>Edit Employee</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>First Name:</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div>
                        <label>Last Name:</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                    <div>
                        <label>Email:</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label>Days:</label>
                        <input type="number" value={days} step= "0.5" onChange={(e) => setDays(e.target.value)} required />
                    </div>
                    {
                        isManager ?
                        <div>
                            <label>Department:</label>
                            <input value={department.name} type="text" disabled />
                        </div>
                        :
                        <div>
                            <label>Department:</label>
                            <select value={department?.id} onChange={(e) => changeDepartment(e.target.value)} required>
                                <option value={department?.id}>{department?.name}</option>
                                {departments.filter(d => d.id !== department?.id).map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    }
                    <div>
                        <label>Location:</label>
                        <select value={locations?.filter(loc => loc.location_name == location)[0].id} onChange={(e) => changeLocation(e.target.value)} required>
                            <option value={locations?.filter(loc => loc.location_name == location)[0].id}>{location}</option>
                            {locations.filter(loc => loc.location_name !== location).map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.location_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Manager:</label>
                        <input 
                            type="text"
                            placeholder='Seach Manager'
                            className='dropdown-input'
                            value={searchTerm}
                            onChange={filterManagers}
                        />
                        {filteredManagers.length > 0 && (
                            <ul className='dropdown-list'>
                                <li onClick={()=>handleManagerSelect(null)}>None</li>
                                {filteredManagers.map(manager => (
                                    <li key={manager.id} onClick={() => handleManagerSelect(manager)}>
                                        {manager.first_name} {manager.last_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label>First Approver:</label>
                        <input 
                            type="text"
                            placeholder='Seach First Approver'
                            className='dropdown-input'
                            value={searchTermFirstApprover}
                            onChange={filterFirstApprovers}
                        />
                        {filteredFirstApprovers.length > 0 && (
                            <ul className='dropdown-list'>
                                <li onClick={()=>handleFirstApproverSelect(null)}>None</li>
                                {filteredFirstApprovers.map(approver => (
                                    <li key={approver.id} onClick={() => handleFirstApproverSelect(approver)}>
                                        {approver.first_name} {approver.last_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button type="submit">Save Changes</button>
                </form>
            </div>
        </div>
    );
};

export default EditEmployeeModal;