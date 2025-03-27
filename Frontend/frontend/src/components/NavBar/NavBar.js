import React from 'react';
import logo from '../../assets/logo.png';
import './NavBar.css';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NavBar = ({ firstName, lastName, handleLogout }) => {
    const navigate = useNavigate();

    const handleLogoClick = () => {
        navigate("/");
    };

    return (
        <div id="nav-bar">
            <img className="nav__bar--logo" src={logo} alt="Logo" onClick={handleLogoClick} />
            <div className="nav__bar--end">
                <p className="nav__bar--username">{firstName} {lastName}</p>
                <Button size="small" variant="contained" onClick={handleLogout}>Logout</Button>
            </div>
        </div>
    );
};

export default NavBar;