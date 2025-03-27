import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import videoFile from '../../assets/animated_background.mp4';
import './NSSFMainPage.css'
import { Button, Menu, MenuItem } from '@mui/material';


const NSSFMainPage =() => {
    const navigate = useNavigate();


    return(
        <>
        <div className='nssf-page'>
            <video className="background-video" autoPlay muted>
                <source src={videoFile} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <ul className='nav-list'>
                <li onClick={() => navigate('/bank-staff')}>Bank Staff</li>
                <li onClick={() => navigate('/bank-branches')}>Branches</li>
                <li onClick={() => navigate('/bank-companies')}>Companies</li>
                <li onClick={() => navigate('/bank-items')}>Items</li>
            </ul>
        </div>
        </>
    );
}

export default NSSFMainPage