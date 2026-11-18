import React from 'react';
import './navbar.css'
import {API_URL} from '../../config'

import {NavLink} from "react-router-dom";
import {useDispatch, useSelector} from "react-redux";
import {logout} from "../../reducers/userReducer";

const Navbar = () => {
    const isAuth = useSelector(state => state.user.isAuth)
    const dispatch = useDispatch()
    const user = useSelector(state=>state.user.currentUser)

    return (
        <div className="navbar">
            <div className="container">
                <div className="university-mark" aria-hidden="true">J<span>U</span></div>
                <div className="navbar__header">ZHUBANOV<span>UNIVERSITY · CLOUD</span></div>
                {!isAuth && <div className="navbar__login"><NavLink to="/login">Войти</NavLink></div> }
                {!isAuth && <div className="navbar__registration"><NavLink to="/registration">Регистрация</NavLink></div> }
                {isAuth && <div className="navbar__account"><NavLink exact to="/">Мой диск</NavLink><NavLink to="/profile">{user.avatar && <img className="navbar-avatar" src={`${API_URL}/static/${user.avatar}`} alt=""/>}Профиль</NavLink></div>}
                {isAuth && <div className="navbar__login" onClick={() => dispatch(logout()) }>Выход</div> }
            </div>
        </div>
    );
};

export default Navbar;
