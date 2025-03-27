import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import './AddEmployeeModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const AddEmployeeModal = ({ token, isOpen, onClose, onEmployeeAdded, departments, locations, employees }) => {
    const [id, setId] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [department, setDepartment] = useState({});
    const [managerId, setManagerId] = useState('');
    const [manager, setManager] = useState([]);
    const [birthday, setBirthday] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [locationId, setLocationId] = useState('');
    const [location, setLocation] = useState({});
    const [firstApprover, setFirstApprover] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredManagers, setFilteredManagers] = useState([]);
    const [firstApproverId, setFirstApproverId] = useState(null);
    const [searchTermFirstApprover, setSearchTermFirstApprover]=useState('')
    const [filteredFirstApprovers, setFilteredFirstApprovers]=useState([])



    useEffect(() => {
        const selectedLocation = locations.find(loc => loc.id === locationId);
        setLocation(selectedLocation);
    }, [locationId, locations]);

    const getCookie = (cname) => {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const hrUser = getCookie('user_id'); // Retrieve the HR user ID from cookie

        // Convert dates to UTC format
        const formatDateToUTC = (date) => {
            if (!date) return null;
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            return utcDate.toISOString().split('T')[0];
        };

        const newEmployee = {
            id,
            firstName,
            middleName,
            lastName,
            email,
            departmentId,
            managerId,
            hrUser,
            birthday: formatDateToUTC(birthday),
            startDate: formatDateToUTC(startDate),
            endDate: formatDateToUTC(endDate),
            locationId,
            firstApproverId
        };

        try {
            await Axios.post(`${baseUrl}/employee`, newEmployee, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onEmployeeAdded();
            onClose();
        } catch (error) {
            console.error('Error adding employee:', error);
        }
    };

    if (!isOpen) return null;
    console.log(locationId)
    return (
        <div className="modal-overlay">
            <div className="modal">
                <button className="close-button" onClick={onClose}>X</button>
                <h2>Add Employee</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>ID:</label>
                        <input type="text" value={id} onChange={(e) => setId(parseInt(e.target.value))} required />
                    </div>
                    <div>
                        <label>First Name:</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div>
                        <label>Middle Name:</label>
                        <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
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
                        <label>Birthday:</label>
                        <DatePicker
                            selected={birthday}
                            onChange={(date) => setBirthday(date)}
                            dateFormat="dd-MM-yyyy"
                            isClearable
                        />
                    </div>
                    <div>
                        <label>Start Date:</label>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            dateFormat="dd-MM-yyyy"
                            isClearable
                        />
                    </div>
                    <div>
                        <label>End Date:</label>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            dateFormat="dd-MM-yyyy"
                            isClearable
                        />
                    </div>
                    <div>
                        <label>Department:</label>
                        <select value={department?.id} onChange={(e) => setDepartmentId(e.target.value)} required>
                            <option value={department?.id}>{department?.name}</option>
                            {departments.filter(d => d.id != department?.id).map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
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
                    <div>
                        <label>Location:</label>
                        <select value={location?.id} onChange={(e) => setLocationId(e.target.value)} required>
                            <option value={location?.id}>{location?.location_name}</option>
                            {locations.filter(loc => loc.id != location?.id).map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.location_name}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit">Add Employee</button>
                </form>
            </div>
        </div>
    );
};

export default AddEmployeeModal;




