import axios from 'axios'
import {API_URL} from '../config'
import {setUser} from "../reducers/userReducer";

export const registration = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/api/auth/registration`, {
            email,
            password
        })
        alert(response.data.message)
    } catch (e) {
        alert(e.response?.data?.message || 'Нет соединения с сервером')
    }
}

export const login =  (email, password) => {
    return async dispatch => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                email,
                password
            })
            dispatch(setUser(response.data.user))
            localStorage.setItem('token', response.data.token)
        } catch (e) {
            alert(e.response?.data?.message || 'Нет соединения с сервером')
        }
    }
}

export const auth =  () => {
    return async dispatch => {
        const token = localStorage.getItem('token')
        if (!token) return
        try {
            const response = await axios.get(`${API_URL}/api/auth/auth`,
                {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}
            )
            if (localStorage.getItem('token') !== token) return
            dispatch(setUser(response.data.user))
            localStorage.setItem('token', response.data.token)
        } catch (e) {
            if (localStorage.getItem('token') !== token) return
            if (e.response?.status === 401) {localStorage.removeItem('token'); dispatch({type:'LOGOUT'})}
        }
    }
}

export const updateAvatar = (file) => async dispatch => {
    const token = localStorage.getItem('token')
    try {
        const data = new FormData()
        if (file) data.append('file', file)
        const response = await axios({method:file ? 'post' : 'delete',url:`${API_URL}/api/files/avatar`,data:file ? data : undefined,headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}})
        if (localStorage.getItem('token') === token) dispatch(setUser(response.data))
    } catch (e) {alert(e.response?.data?.message || 'Не удалось изменить аватар')}
}
