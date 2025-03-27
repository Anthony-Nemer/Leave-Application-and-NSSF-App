import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import Axios from 'axios';
import './NewMedicalBill.css'

const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const TOPAMOUNT = 3000000;

const NewMedicalBill = ({ token, userId, bankEmployees, getBankEmployees }) => {
    const navigate = useNavigate();

    const [activePayments, setActivePayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState('');
    const [nssfNo, setNssfNo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [insurerData, setInsurerData] = useState({
        insuredName: '', 
        nssfNo: '',
        company: '',
        company_id: '',
        branch: '',
        branch_id: '',
        bankPin: '',
    });
    const [filteredEmployees, setFilteredEmployees] = useState(bankEmployees);
    const [items, setItems] = useState([]);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [companyId, setCompanyId] = useState('')
    const [branchId, setBranchId] = useState('')
    const [selectedItem1, setSelectedItem1] = useState('');
    const [NssfAmount1, setNssfAmount1] = useState('');
    const [NssfShare1, setNssfShare1] = useState('');
    const [InvoiceAmount1, setInvoiceAmount1] = useState('');
    const [bankShare1, setBankShare1] = useState('');
    const [caseTotal1, setCaseTotal1] = useState('');
    const [caseTotalDollar1, setCaseTotalDollar1] = useState('');
    const [rate, setRate] = useState(0);  // New state to store the rate

    const [selectedItem2, setSelectedItem2] = useState('');
    const [nssfAmount2, setnssfAmount2] = useState('');
    const [NssfShare2, setNssfShare2] = useState('');
    const [InvoiceAmount2, setInvoiceAmount2] = useState('');
    const [bankShare2, setBankShare2] = useState('');
    const [caseTotal2, setCaseTotal2] = useState('');
    const [caseTotalDollar2, setCaseTotalDollar2] = useState('');
    const [error, setError] = useState('');

    const fetchActivePayments = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/bank_active_payments`);
            setActivePayments(response.data);
        } catch (error) {
            console.error('Error fetching bank payments:', error);
            setError('Error fetching payments');
        }
    };

    const fetchItems = async () => {
        try {
            const response = await Axios.get(`${baseUrl}/get-items`);
            setItems(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectChange = (e) => {
        setSelectedPayment(e.target.value);
    };

    const handleNssfChange = (e) => {
        const value = e.target.value;
        setNssfNo(value);
        filterEmployees(value, searchQuery);
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        filterEmployees(nssfNo, value);
    };

    const handleSelectItem1 = (e) => {
        const selectedItemId = e.target.value;
        const selectedItem = items.find(item => item.id === parseInt(selectedItemId)); 
        var nssfAmount;
        if (selectedItemId == 3 || selectedItemId == 4) {
            const lbpAmount = selectedItem.price * 1000000;  
            nssfAmount = lbpAmount * selectedItem.percentage;  
    
            setSelectedItem1(selectedItem.id);
            setNssfAmount1(lbpAmount);  
            setNssfShare1(nssfAmount);  
        }else{
            const dollar = selectedItem.price;
            const toLbp = dollar * rate;
            nssfAmount = toLbp * selectedItem.percentage;
            setSelectedItem1(selectedItem.id);
            setInvoiceAmount1(toLbp);
            setNssfAmount1(toLbp);  
            setNssfShare1(nssfAmount);
        }
    };


    const handleManualNssfAmount1 = (e) => {
        const selectedItem = items.find(item => item.id === parseInt(selectedItem1)); 
        const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
    
        setNssfAmount1(value);
    
        const updatedNssfShare1 = value * selectedItem.percentage; // Calculate updated NSSF Share
        setNssfShare1(updatedNssfShare1);
    
        const totalLbp = updatedNssfShare1;  // Total is based on NSSF Share
        setCaseTotal1(totalLbp);
        setBankShare1(0);
        if (rate !== 0) {
            const totalInDollars = totalLbp / rate; // Convert LBP to dollars using the rate
            setCaseTotalDollar1(totalInDollars);
        }
    };
        
    const handleManualNssfAmount2 = (e) => {
        const selectedItem = items.find(item => item.id === parseInt(selectedItem2)); 
        const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
    
        setnssfAmount2(value);
    
        const updatedNssfShare2 = value * selectedItem.percentage; // Calculate updated NSSF Share
        setNssfShare2(updatedNssfShare2);
    
        const totalLbp = updatedNssfShare2;  // Total is based on NSSF Share
        setCaseTotal2(totalLbp);
        setBankShare2(0);

        if (rate !== 0) {
            const totalInDollars = totalLbp / rate; // Convert LBP to dollars using the rate
            setCaseTotalDollar2(totalInDollars);
        }
    };

    const handleInvoiceAmount1 = (e) => {
        if(selectedItem1 == 3 || selectedItem1 == 4){
            const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
            setInvoiceAmount1(value);
        
        let share = value * 0.75;
    
        if (NssfShare1 + share > TOPAMOUNT) {
            share = TOPAMOUNT - NssfShare1;
        }
        setBankShare1(share);
    
        const total = NssfShare1 + share;
        setCaseTotal1(total);
    
        if (rate !== 0) {
            const totalInDollars = total / rate;
            setCaseTotalDollar1(totalInDollars);
        }}
        else{
            const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
            setInvoiceAmount1(value);
            setBankShare1(0);
            const total = NssfShare1;
            setCaseTotal1(total);
        
            if (rate !== 0) {
                const totalInDollars = total / rate;
                setCaseTotalDollar1(totalInDollars);
            }
        }
    };

    const handleSelectItem2 = (e) => {
        const selectedItemId = e.target.value;
        const selectedItem = items.find(item => item.id === parseInt(selectedItemId)); 
        var nssfAmount;
        if (selectedItemId == 3 || selectedItemId == 4) {
            const lbpAmount = selectedItem.price * 1000000;  
            nssfAmount = lbpAmount * selectedItem.percentage;

            setSelectedItem2(selectedItem.id);
            setnssfAmount2(lbpAmount);  
            setNssfShare2(nssfAmount);  
        }else{
            const dollar = selectedItem.price;
            const toLbp = dollar * rate;
            nssfAmount = toLbp * selectedItem.percentage;  

            setSelectedItem2(selectedItem.id);
            setInvoiceAmount2(toLbp);
            setnssfAmount2(toLbp);  
            setNssfShare2(nssfAmount);
        }
    };

    const handleInvoiceAmount2 = (e) => {
        if(selectedItem2 == 3 || selectedItem2 == 4){
        const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
        setInvoiceAmount2(value);
        
        let share = value * 0.75;
    
        if (NssfShare2 + share > TOPAMOUNT) {
            share = TOPAMOUNT - NssfShare2;
        }
        setBankShare2(share);
    
        const total = NssfShare2 + share;
        setCaseTotal2(total);
    
        if (rate !== 0) {
            const totalInDollars = total / rate;
            setCaseTotalDollar2(totalInDollars);
        }}
        else{
            const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
            setInvoiceAmount2(value);
            setBankShare2(0);
            const total = NssfShare2;
            setCaseTotal2(total);
            if (rate !== 0) {
                const totalInDollars = total / rate;
                setCaseTotalDollar2(totalInDollars);
            }
        }
    };

    const filterEmployees = (nssf, name) => {
        let filtered = bankEmployees;

        if (nssf) {
            filtered = filtered.filter((emp) => emp.nssf_no.includes(nssf));
        }

        if (name) {
            filtered = filtered.filter((emp) =>
                `${emp.first_name_en} ${emp.last_name_en}`.toLowerCase().includes(name.toLowerCase())
            );
        }

        setFilteredEmployees(filtered);
    };

    const handleInsuredSelect = (e) => {
        const selectedEmployee = bankEmployees.find(
            (emp) => emp.id === parseInt(e.target.value)
        );

        if (selectedEmployee) {
            setInsurerData({
                insuredName: selectedEmployee.id, 
                nssfNo: selectedEmployee.nssf_no,
                company: selectedEmployee.company_name,
                company_id: selectedEmployee.company_id,
                branch: selectedEmployee.branch_location,
                branch_id: selectedEmployee.location,
                bankPin: selectedEmployee.bank_pin,
            });
            setNssfNo(selectedEmployee.nssf_no);        
        }
    };

    const handleSendPayment = async (e) => {
        e.preventDefault();
    
    
        try {
            // Validate at least one medical case is not null
            if (!selectedItem1 && !selectedItem2) {
                console.error("At least one medical case must be provided.");
                return;
            }
    
            const convertToMillions = (amount) => (amount / 1000000).toFixed(2); // Round to 2 decimals
    
            // Ensure caseTotalDollar is a number and round it to 2 decimal places
            const formatDollarAmount = (amount) => {
                return isNaN(amount) ? '0.00' : parseFloat(amount).toFixed(2);
            };
    
            // Convert case totals in dollars to two decimal places
            const caseTotalDollar1Formatted = formatDollarAmount(caseTotalDollar1);
            const caseTotalDollar2Formatted = formatDollarAmount(caseTotalDollar2);
    
            // Send data to bank_bills API
            const billsResponse = await Axios.post(`${baseUrl}/insert-bank-bill`, {
                token,
                payment_id: selectedPayment,
                invoice_date: invoiceDate,
                ensured_id: insurerData.insuredName
            },{headers: { Authorization: `Bearer ${token}` }});
    
            const { bill_id } = billsResponse.data;
    
            const medicalCases = [];
            if (selectedItem1) {
                medicalCases.push({
                    bill_id,
                    item_id: selectedItem1,
                    nssf_amount: convertToMillions(NssfAmount1),
                    nssf_share: convertToMillions(NssfShare1),
                    invoice_amount: convertToMillions(InvoiceAmount1),
                    bank_share: convertToMillions(bankShare1),
                    total_lbp: convertToMillions(caseTotal1),
                    total_dollars: caseTotalDollar1Formatted, // Using the formatted value
                });
            }
            if (selectedItem2) {
                medicalCases.push({
                    bill_id,
                    item_id: selectedItem2,
                    nssf_amount: convertToMillions(nssfAmount2),
                    nssf_share: convertToMillions(NssfShare2),
                    invoice_amount: convertToMillions(InvoiceAmount2),
                    bank_share: convertToMillions(bankShare2),
                    total_lbp: convertToMillions(caseTotal2),
                    total_dollars: caseTotalDollar2Formatted, // Using the formatted value
                });
            }
            
            // Send data to bank_medical_cases API
            await Axios.post(`${baseUrl}/insert-medical-cases`, { medicalCases });



            setSelectedPayment('');
            setInvoiceDate('');
            setInsurerData({
                insuredId: '',
                insuredName: '', 
                nssfNo: '',
                company: '',
                company_id: '',
                branch: '',
                branch_id: '',
                bankPin: '',
            });
            setNssfNo('');
            setSelectedItem1('');
            setSelectedItem2('');
            setNssfAmount1('');
            setnssfAmount2('');
            setNssfShare1('');
            setNssfShare2('');
            setInvoiceAmount1('');
            setInvoiceAmount2('');
            setBankShare1('');
            setBankShare2('');
            setCaseTotal1('');
            setCaseTotal2('');
            setCaseTotalDollar1('');
            setCaseTotalDollar2('');

            window.location.reload();
        } catch (error) {
            console.error("Error during form submission:", error.message || error);
        }
    };
    

    useEffect(() => {
        if (selectedPayment) {
            const fetchRate = async () => {
                try {
                    const response = await Axios.get(`${baseUrl}/get-rate`, {
                        params: { paymentId: selectedPayment },  
                    });
                    
                    if (response.data && response.data.rate) {
                        const fetchedRate = response.data.rate;
                        setRate(fetchedRate);  
                    } else {
                        console.error('Rate not found in the response');
                    }
                } catch (error) {
                    console.error('Error fetching the rate:', error);
                }
            };
    
            fetchRate();
        }
    }, [selectedPayment]); 

    useEffect(() => {
        fetchItems();
        fetchActivePayments();
    }, [token]);

    return (
        <div className="employees__table--container">
            <div className="employees__table--header">
                <Button
                    style={{ marginBottom: '10px' }}
                    variant="contained"
                    onClick={() => navigate(`/medical-home`)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-left" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8" />
                    </svg>
                </Button>
                <h1>New Medical Bill</h1>
            </div>

            <form className="form-group">
    <label className="required">
        Payment code:
        <select value={selectedPayment} onChange={handleSelectChange} required>
            <option value="" disabled>
                Select Payment
            </option>
            {activePayments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                    {payment.payment_name} (rate: {payment.rate})
                </option>
            ))}
        </select>
    </label>
    <label className="required">
        Invoice Date:
        <input 
            type="date" 
            value={invoiceDate} 
            onChange={(e) => setInvoiceDate(e.target.value)} 
            required
        />
    </label>

    <label>
        NSSF No.:
        <input
            type="number"
            value={nssfNo}
            onChange={handleNssfChange}
        />
    </label>
    <label>
        Search by Name:
        <input
            type="text"
            placeholder="Search by name"
            value={searchQuery}
            onChange={handleSearchChange}
        />
    </label>
    <label className="required">
        Insured Name:
        <select
            value={insurerData.insuredName}
            onChange={handleInsuredSelect}
            required
        >
            <option value="" disabled>
                Select Insured
            </option>
            {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                    {emp.first_name_en} {emp.last_name_en} ({emp.nssf_no})
                </option>
            ))}
        </select>
    </label>

    <label>
        Branch:
        <input
            type="text"
            value={insurerData.branch}
            readOnly
        />
    </label>

    <label>
        Company:
        <input
            type="text"
            value={insurerData.company}
            readOnly
        />
    </label>

    <label>
        Bank PIN:
        <input
            type="text"
            value={insurerData.bankPin}
            readOnly
        />
    </label>

    <hr style={{ marginTop: '20px', marginBottom: '20px', border: 'none', borderTop: '3px solid rgb(46, 46, 46)' }} />
    
    <div className='items'>
        <label className="required">
            Medical Case 1:
            <select
                value={selectedItem1}
                onChange={handleSelectItem1}
                required
            >
                <option value="" disabled>
                    Select Medical Case
                </option>
                {items.map((i) => (
                    <option key={i.id} value={i.id}>
                        {i.item_name}
                    </option>
                ))}
            </select>                
        </label>
        <label className="required">
            Invoice Amount:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(InvoiceAmount1)}  
            onChange={handleInvoiceAmount1}  
            required/>
        </label> 
        <label>
            NSSF Amount:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(NssfAmount1)}  
            onChange={handleManualNssfAmount1}
            readOnly={selectedItem1.price === null}/>
        </label>   
        <label>
            NSSF Share:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(NssfShare1)}  
            readOnly  />
        </label>   
        <label>
            Bank Share:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(bankShare1)}  
            readOnly  />
        </label> 
        <label>
            Case Total:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(caseTotal1)}  
            readOnly  />
        </label> 
        <label>
            Case Total ($):
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(caseTotalDollar1)}  
            readOnly  />
        </label> 
    </div>
    <hr style={{ marginTop: '20px', marginBottom: '20px', border: 'none', borderTop: '3px solid rgb(46, 46, 46)' }} />

    <div className='items'>
        <label className="required">
            Medical Case 2:
            <select
                value={selectedItem2}
                onChange={handleSelectItem2}
            >
                <option value="" disabled>
                    Select Medical Case
                </option>
                {items.map((i) => (
                    <option key={i.id} value={i.id}>
                        {i.item_name}
                    </option>
                ))}
            </select>                
        </label>
        <label className="required">
            Invoice Amount:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(InvoiceAmount2)}  
            onChange={handleInvoiceAmount2}  />
        </label> 
        <label>
            NSSF Amount:    
            <input         
            type="text" 
            onChange={handleManualNssfAmount2}
            value={new Intl.NumberFormat('en-US').format(nssfAmount2)}  
            readOnly={selectedItem2.price === null}  />
        </label>   
        <label>
            NSSF Share:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(NssfShare2)}  
            readOnly  />
        </label>   

        <label>
            Bank Share:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(bankShare2)}  
            readOnly  />
        </label> 
        <label>
            Case Total:
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(caseTotal2)}  
            readOnly  />
        </label> 
        <label>
            Case Total ($):
            <input         
            type="text" 
            value={new Intl.NumberFormat('en-US').format(caseTotalDollar2)}  
            readOnly  />
        </label> 
    </div> 
    <Button color='primary' variant="contained" onClick={handleSendPayment}>Send Bill</Button>       
</form>

        </div>
    );
};

export default NewMedicalBill;
