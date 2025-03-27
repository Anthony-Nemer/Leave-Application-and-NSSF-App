import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import videoFile from '../../assets/animated_background.mp4';
import './BankMedicalHome.css'
import { Button, Menu, MenuItem } from '@mui/material';


const BankMedicalHome =() => {
    const navigate = useNavigate();


    return(
        <>
        <div className='nssf-page'>
            <video className="background-video" autoPlay muted>
                <source src={videoFile} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <ul className='nav-list'>
                <li onClick={() => navigate('/bank-payments')}>Bank Payments</li>
                <li onClick={() => navigate('/new-medical-bill')}>New Medical Bill</li>
                {/* <li onClick={() => navigate('/new-medical-bill')}>Reports</li> */}
            </ul>
        </div>
        </>
    );
}

export default BankMedicalHome