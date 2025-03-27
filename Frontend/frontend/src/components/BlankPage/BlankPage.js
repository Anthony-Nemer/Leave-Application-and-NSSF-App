import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BlankPage.css';
import videoFile from '../../assets/animated_background.mp4';
import { Button, Menu, MenuItem } from '@mui/material';


const BlankPage = ({ isHr, isManager, isEmployee, isFirstApprover, isNSSF}) => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const [nssfAnchorEl, setNssfAnchorEl] = useState(null); // For NSSF menu
    const open = Boolean(anchorEl);
    const nssfOpen = Boolean(nssfAnchorEl); // For NSSF menu


    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    
    const handleNavigate = (path) => {
        handleMenuClose();
        navigate(path);
    };

    const handleNssfMenuClick = (event) => {
        setNssfAnchorEl(event.currentTarget);
    };

    const handleNssfMenuClose = () => {
        setNssfAnchorEl(null);
    };

    const handleNssfNavigate = (path) => {
        handleNssfMenuClose();
        navigate(path);
    };


    return (
        <div className="blank-page">
            <video className="background-video" autoPlay muted>
                <source src={videoFile} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="button-container">
                <Button
                    variant="contained"
                    onClick={handleMenuClick}
                    className="menu-button"
                >
                    Leave System
                </Button>
                {isNSSF && (
                    <Button
                        variant="contained"
                        onClick={handleNssfMenuClick}
                        className="nssf-button"
                    >
                        NSSF
                    </Button>
                )}
            </div>

            <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'basic-button',
                }}
            >
                {isHr && (
                    <>
                        <MenuItem onClick={() => handleNavigate('/hr-leave-requests')}>All Employee Leave Requests</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/staff')}>Staff</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/shared-calendar')}>Shared Calendar</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/orgchart')}>Organizational Chart</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/departments')}>Departments</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/locations')}>Locations</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/leave-balance-logs')}>Leave Balance Logs</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/logs')}>HR Logs</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/holiday-form')}>Holiday Form</MenuItem>
                    </>
                )}
                {isManager && (
                    <>
                        <MenuItem onClick={() => handleNavigate('/manager-leave-requests')}>Team Members Leave Requests</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/team-summary')}>Team Summary</MenuItem>
                    </>
                )}
                {isFirstApprover && (
                    <>
                        <MenuItem onClick={() => handleNavigate('/first-approval-requests')}>Department Leave Requests</MenuItem>
                    </>
                )}
                {(isHr || isManager || isEmployee || isFirstApprover) && (
                    <>
                        <MenuItem onClick={() => handleNavigate('/leave-requests')}>My Leave Requests</MenuItem>
                        <MenuItem onClick={() => handleNavigate('/leave-summary')}>My Leave Summary</MenuItem>
                    </>
                )}

            </Menu>
            <Menu
                id="nssf-menu"
                anchorEl={nssfAnchorEl}
                open={nssfOpen}
                onClose={handleNssfMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'nssf-button',
                }}
            >
                <MenuItem onClick={() => handleNssfNavigate('/bank-info')}>Bank Info</MenuItem>
                <MenuItem onClick={() => handleNssfNavigate('/medical-home')}>Medical Bills</MenuItem>
            </Menu>

            
        </div>
    );
};

export default BlankPage;


