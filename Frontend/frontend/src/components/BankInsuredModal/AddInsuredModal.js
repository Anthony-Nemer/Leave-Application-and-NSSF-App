import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import './AddInsuredModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const AddInsuredModal = ({ token, isOpen, onClose, onInsuredAdded, bankLocations, bankCompanies, bankRelations, pureBankEmployees}) => {

    const [id, setId] = useState(null);
    const [firstNameEn, setFirstNameEn] = useState('');
    const [middleNameEn, setMiddleNameEn] = useState('');
    const [lastNameEn, setLastNameEn] = useState('');
    const [maidenEn, setMaidenEn] = useState('');
    const [firstNameAr, setFirstNameAr] = useState('');
    const [middleNameAr, setMiddleNameAr] = useState('');
    const [lastNameAr, setLastNameAr] = useState('');
    const [maidenAr, setMaidenAr] = useState('');
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
    const [error, setError] =useState('');



    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';  
        return date.toISOString().split('T')[0]; 
    };

    const changeLocation = (id) => {
        const selectedLocation = bankLocations.find(loc => loc.id === parseInt(id));
        if (selectedLocation) {
            const newLocationId = selectedLocation.id;
            setBankLocationId(newLocationId);
            setBankLocation(selectedLocation.location);
        } else {
            setBankLocationId(null);
            setBankLocation('');
        }
    };

    const changeCompany = (id) => {
        const selectedCompany = bankCompanies.find(comp => comp.id === parseInt(id));
        if (selectedCompany) {
            setBankCompanyId(id);
            setBankCompany(selectedCompany.company_name);
        } else {
            setBankCompanyId(null);
            setBankCompany('');
        }
    };

    const fetchRelativeInfo = (id) => {
        const relative = pureBankEmployees.find(emp => emp.id === id);
        if (relative) {
            setBankLocationId(relative.location_id);
            setBankLocation(relative.branch_location); 
            setBankCompanyId(relative.company_id);
            setBankCompany(relative.company_name);    
            setNssfNo(relative.nssf_no);
            setBankPin(relative.bank_pin);
        }
    };

    const filterRelatedTo = (e) => {
        setSearchTermRelatedTo(e.target.value);
        const filtered = pureBankEmployees.filter(emp =>
            emp.first_name_en.toLowerCase().includes(e.target.value.toLowerCase()) ||
            emp.last_name_en.toLowerCase().includes(e.target.value.toLowerCase())
        );
        setFilteredRelatedTo(filtered);
    };

    const handleRelatedToSelect = (emp) => {
        if (emp === null) {
            setRelatedToId(null);
            setSearchTermRelatedTo("None");
            setFilteredRelatedTo([]);
        } else {
            setRelatedToId(emp.id);
            setSearchTermRelatedTo(`${emp.first_name_en} ${emp.last_name_en}`);
            setFilteredRelatedTo([]);
            fetchRelativeInfo(emp.id); 
        }
    };


    useEffect(() => {
        if (isOpen) {
            setFirstNameEn('');
            setMiddleNameEn('');
            setLastNameEn('');
            setMaidenEn('');
            setFirstNameAr('');
            setMiddleNameAr('');
            setLastNameAr('');
            setMaidenAr('');
            setDateOfBirth('');
            setRelation(null);
            setRelatedToId(null);
            setRelatedToFullName('');
            setNssfNo(null);
            setBankPin(null);
            setBankLocation(null);
            setBankLocationId(null);
            setBankCompany(null);
            setBankCompanyId(null);
            setSearchTermRelatedTo('');
            setFilteredRelatedTo([]);
        }
    }, [isOpen]); 


    useEffect(() => {
        if (relation === '6') {
            handleRelatedToSelect(null); 
        }
    }, [relation]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const newInsured = {
            firstNameEn,
            middleNameEn,
            lastNameEn,
            maidenEn,
            firstNameAr,
            middleNameAr,
            lastNameAr,
            maidenAr,
            dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : '',
            relation,
            relatedToId,
            nssfNo: nssfNo,  
            bankPin: bankPin,  
            bankLocationId,
            bankCompanyId
        };
    

        
        try {
            await Axios.post(`${baseUrl}/add-insured`, newInsured, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onInsuredAdded();  
            onClose();  
        } catch (error) {
            const errorMessage =
            error.response?.data?.error || error.message || 'An unexpected error occurred.';
            setError(errorMessage);
            console.error('Error adding insured:', error);
        }
    };
    

    const handleRelationChange = (e) => {
        const newRelation = e.target.value;
        setRelation(newRelation); 
    };

    const handleClose = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <button className="close-button" onClick={handleClose}>X</button>
                <h2>New Bank Insured</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>First Name - En:</label>
                        <input type="text" value={firstNameEn} onChange={(e) => setFirstNameEn(e.target.value.trim())} required />
                    </div>
                    <div>
                        <label>Middle Name - En:</label>
                        <input type="text" value={middleNameEn} onChange={(e) => setMiddleNameEn(e.target.value.trim())} />
                    </div>
                    <div>
                        <label>Last Name - En:</label>
                        <input type="text" value={lastNameEn} onChange={(e) => setLastNameEn(e.target.value.trim())} required />
                    </div>
                    <div>
                        <label>Maiden Name - En:</label>
                        <input type="text" value={maidenEn} onChange={(e) => setMaidenEn(e.target.value.trim())} />
                    </div>
                    <div>
                        <label>First Name - Ar:</label>
                        <input type="text" value={firstNameAr} onChange={(e) => setFirstNameAr(e.target.value.trim())} required />
                    </div>
                    <div>
                        <label>Middle Name - Ar:</label>
                        <input type="text" value={middleNameAr} onChange={(e) => setMiddleNameAr(e.target.value.trim())} />
                    </div>
                    <div>
                        <label>Last Name - Ar:</label>
                        <input type="text" value={lastNameAr} onChange={(e) => setLastNameAr(e.target.value.trim())} required />
                    </div>
                    <div>
                        <label>Maiden Name - Ar:</label>
                        <input type="text" value={maidenAr} onChange={(e) => setMaidenAr(e.target.value.trim())} />
                    </div>
                    <div>
                        <label>Date Of Birth:</label>
                        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                    </div>
                    <div>
                        <label>Relation:</label>
                        <select value={relation || ''} onChange={handleRelationChange} required>
                            <option value="" disabled>Select Relation</option>
                            {bankRelations.map(rel => (
                                <option key={rel.id} value={rel.id}>{rel.relation}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Related To:</label>
                        <input
                            type="text"
                            placeholder="Search Employees"
                            className="dropdown-input"
                            value={relation === '6' ? '' : searchTermRelatedTo}
                            onChange={filterRelatedTo}
                            disabled={relation == '6'}
                        />
                        {filteredRelatedTo.length > 0 && (
                            <ul className="dropdown-list">
                                <li onClick={() => handleRelatedToSelect(null)}>None</li>
                                {filteredRelatedTo.map(emp => (
                                    <li key={emp.id} onClick={() => { handleRelatedToSelect(emp); }}>
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
                    {error && <div className="error">{error}</div>}
                    <button type="submit">Save changes</button>
                </form>
            </div>
        </div>
    );
};

export default AddInsuredModal;
