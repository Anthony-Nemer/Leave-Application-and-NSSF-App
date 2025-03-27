import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import './BankEditEmployeeModal.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

const BankEditEmployeeModal = ({isOpen, onClose, employee, onEmployeeUpdated, bankLocations, bankCompanies, bankRelations, bankEmployees, pureBankEmployees}) => {
    const [initialEmployeeData, setInitialEmployeeData] = useState({});
    const [id, setId] = useState(null);
    const [firstNameEn, setFirstNameEn] = useState('');
    const [middleNameEn, setMiddleNameEn] = useState('');
    const [lastNameEn, setLastNameEn] = useState('');
    const [firstNameAr, setFirstNameAr] = useState('');
    const [middleNameAr, setMiddleNameAr] = useState('');
    const [lastNameAr, setLastNameAr] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [relation, setRelation] = useState(null);
    const [relatedToId, setRelatedToId] = useState(null);
    const [relatedToFullName, setRelatedToFullName] = useState('');
    const [nssfNo, setNssfNo] = useState(null);
    const [bankPin, setBankPin] = useState(null);
    const [bankLocation, setBankLocation] = useState(null);
    const [bankLocationId, setBankLocationId] = useState(null);
    const [bankCompany, setBankCompany] = useState(null);
    const [bankCompanyId, setBankCompanyId] = useState(null);


    const [searchTermRelatedTo, setSearchTermRelatedTo] = useState('');
    const [filteredRelatedTo, setFilteredRelatedTo] = useState([]);

    
    function getCookie(cname) {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for(let i = 0; i < ca.length; i++) {
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

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';  
        return date.toISOString().split('T')[0]; 
    };


    useEffect(() => {
        if (employee) {
            const initialData = {
                id: employee.id,
                firstNameEn: employee.first_name_en,
                middleNameEn: employee.middle_name_en,
                lastNameEn: employee.last_name_en,
                firstNameAr: employee.first_name_ar,
                middleNameAr: employee.middle_name_ar,
                lastNameAr: employee.last_name_ar,
                dateOfBirth: employee.date_of_birth ? formatDate(employee.date_of_birth) : '',
                relation: employee.relation || '',
                relatedToId: employee.related_to,
                relatedToFullName: employee.related_to_full_name,
                nssfNo: employee.nssf_no,
                bankPin: employee.bank_pin,
                bankLocation: employee.branch_location,
                bankCompany: employee.company_name,
                bankLocationId: employee.location,
                bankCompanyId: employee.company_id

            };


            setInitialEmployeeData(initialData);
            setId(initialData.id);
            setFirstNameEn(initialData.firstNameEn);
            setMiddleNameEn(initialData.middleNameEn);
            setLastNameEn(initialData.lastNameEn);
            setFirstNameAr(initialData.firstNameAr);
            setMiddleNameAr(initialData.middleNameAr);
            setLastNameAr(initialData.lastNameAr);
            setDateOfBirth(initialData.dateOfBirth);
            setBankLocation(initialData.bankLocation);
            setBankLocationId(initialData.bankLocationId);
            setBankCompany(initialData.bankCompany);
            setBankCompanyId(initialData.bankCompanyId);
            setRelation(initialData.relation);
            setRelatedToId(initialData.relatedToId)
            setRelatedToFullName(initialData.relatedToFullName);
            setSearchTermRelatedTo(initialData.relatedToFullName || "None");
            setNssfNo(initialData.nssfNo);
            setBankPin(initialData.bankPin);
        }
    }, [employee, bankLocations, bankCompanies]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updatedEmployee = {
                id, 
                firstNameEn,
                middleNameEn,
                lastNameEn,
                firstNameAr,
                middleNameAr,
                lastNameAr,
                dateOfBirth,
                bankLocationId,
                bankCompanyId,
                relation,
                relatedToId,
                nssfNo,
                bankPin,
            };
            console.log(relation);
            const response = await Axios.patch(`${baseUrl}/update-bank-employee/${employee.id}`, updatedEmployee, {
                headers: { Authorization: `Bearer ${getCookie('access_token')}` }
            });
            onEmployeeUpdated(response.data);
            onClose();
        } catch (error) {
            console.error('Error updating bank employee:', error);
        }
    };

    const handleClose = () => {
        if (initialEmployeeData.id) {
            setFirstNameEn(initialEmployeeData.firstNameEn);
            setMiddleNameEn(initialEmployeeData.middleNameEn);
            setLastNameEn(initialEmployeeData.lastNameEn);
            setFirstNameAr(initialEmployeeData.firstNameAr);
            setMiddleNameAr(initialEmployeeData.middleNameAr);
            setLastNameAr(initialEmployeeData.lastNameAr);
            setDateOfBirth(initialEmployeeData.dateOfBirth);
            setBankLocation(initialEmployeeData.bankLocation);
            setBankLocationId(initialEmployeeData.bankLocationId);
            setBankCompany(initialEmployeeData.bankCompany);
            setBankCompanyId(initialEmployeeData.bankCompanyId);
            setRelation(initialEmployeeData.relation);
            setNssfNo(initialEmployeeData.nssfNo);
            setBankPin(initialEmployeeData.bankPin);
        }
        onClose();
    };
    

    const changeLocation = (id) => {

        const selectedLocation = bankLocations.find(loc => loc.id === parseInt(id)); // Ensure type consistency
        if (selectedLocation) {
            const newLocationId = selectedLocation.id;
            setBankLocationId(newLocationId);
            setBankLocation(selectedLocation.location);
        } else {
            console.error(`Location with ID ${id} not found in bankLocations.`);
            setBankLocationId(null);
            setBankLocation('');
        }
    };

    const changeCompany = (id) => {
        const selectedCompany = bankCompanies.find(comp => comp.id === parseInt(id)); // Ensure type consistency
        
        if (selectedCompany) {
            setBankCompanyId(id);
            setBankCompany(selectedCompany.company_name);
        } else {
            console.error(`Company with ID ${id} not found in bankCompanies.`);
            setBankCompanyId(null);
            setBankCompany('');
        }
    };
    
    



    const filterRelatedTo = (e) => {
        setSearchTermRelatedTo(e.target.value)
        const filtered = pureBankEmployees.filter(emp => 
            emp.first_name_en.toLowerCase().includes(e.target.value.toLowerCase()) || 
            emp.last_name_en.toLowerCase().includes(e.target.value.toLowerCase())
        )
        setFilteredRelatedTo(filtered)
    }
    const handleRelatedToSelect = (emp) => {
        if(emp===null){
            setRelatedToId(null)
            setSearchTermRelatedTo("None")
            setFilteredRelatedTo([])
        }else{
            setRelatedToId(emp.id)
            setSearchTermRelatedTo(`${emp.first_name_en} ${emp.last_name_en}`)
            setFilteredRelatedTo([])
        }
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <button className="close-button" onClick={handleClose}>X</button>
                <h2>Edit Bank Insured</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>First Name - En:</label>
                        <input type="text" value={firstNameEn} onChange={(e) => setFirstNameEn(e.target.value)} required />
                    </div>
                    <div>
                        <label>Middle Name - En:</label>
                        <input type="text" value={middleNameEn} onChange={(e) => setMiddleNameEn(e.target.value)}  />
                    </div>
                    <div>
                        <label>Last Name - En:</label>
                        <input type="text" value={lastNameEn} onChange={(e) => setLastNameEn(e.target.value)} required />
                    </div>
                    <div>
                        <label>First Name - Ar:</label>
                        <input type="text" value={firstNameAr} onChange={(e) => setFirstNameAr(e.target.value)} required />
                    </div>
                    <div>
                        <label>Middle Name - Ar:</label>
                        <input type="text" value={middleNameAr} onChange={(e) => setMiddleNameAr(e.target.value)} />
                    </div>
                    <div>
                        <label>Last Name - Ar:</label>
                        <input type="text" value={lastNameAr} onChange={(e) => setLastNameAr(e.target.value)} required />
                    </div>
                    <div>
                        <label>Date Of Birth:</label>
                        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                    </div>
                    <div>
                        <label>Relation:</label>
                        <select value={relation || ''} onChange={(e) => setRelation(e.target.value)} required>
                            <option value="" disabled>Select Relation</option>
                            {bankRelations.map(rel => (
                                <option key={rel.id} value={rel.id}>{rel.relation}</option>
                            ))}
                            {relation && !bankRelations.find(rel => rel.id === relation) && (
                                <option value={relation}>{employee.relation}</option>
                            )}
                        </select>

                    </div>

                    <div>
                        <label>Related To:</label>
                        <input 
                            type="text"
                            placeholder='Seach Employees'
                            className='dropdown-input'
                            value={searchTermRelatedTo}
                            onChange={filterRelatedTo}
                            disabled = {relation == '6'}
                        />
                        {filteredRelatedTo.length > 0 && (
                            <ul className='dropdown-list'>
                                <li onClick={()=>handleRelatedToSelect(null)}>None</li>
                                {filteredRelatedTo.map(emp => (
                                    <li key={emp.id} onClick={() => handleRelatedToSelect(emp)}>
                                        {emp.first_name_en} {emp.last_name_en} ({emp.nssf_no})
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label>Location:</label>
                        <select value={bankLocationId || ''} onChange={(e) => changeLocation(e.target.value)} disabled={relation != '6'} required>
                            <option value="" disabled>Select a location</option>
                            {bankLocations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.location}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Company:</label>
                        <select value={bankCompanyId || ''} onChange={(e) => changeCompany(e.target.value)} disabled={relation != '6'} required>
                            <option value="" disabled>Select a company</option>
                            {bankCompanies.map(comp => (
                                <option key={comp.id} value={comp.id}>{comp.company_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>NSSF Number:</label>
                        <input type="text" value={nssfNo} onChange={(e) => setNssfNo(e.target.value)} disabled={relation != '6'} required />
                    </div>
                    <div>
                        <label>Bank Pin:</label>
                        <input type="text" value={bankPin} onChange={(e) => setBankPin(e.target.value)} disabled={relation != '6'} required />
                    </div>
                    <button type="submit">Save changes</button>
                </form>
            </div>
        </div>
    );
};

export default BankEditEmployeeModal;
