import axios from 'axios'
import {setPopupDisplay} from '../reducers/fileReducer'
import {auth} from './user'
import {API_URL} from '../config'
const headers = () => ({Authorization: `Bearer ${localStorage.getItem('token')}`})
const message = e => e.response?.data?.message || e.message || 'Нет соединения с сервером'
let requestId = 0
export function getFiles(dirId, sort = 'name', search = '') {
    return async dispatch => {
        const id = ++requestId
        dispatch({type:'FILES_REQUEST',payload:id})
        try {
            const response = await axios.get(`${API_URL}/api/files${search ? '/search' : ''}`, {
                params: search ? {search,sort} : {parent:dirId || undefined,sort}, headers:headers()
            })
            dispatch({type:'FILES_RECEIVED',payload:{id,files:response.data}})
        } catch (e) {dispatch({type:'FILES_FAILED',payload:{id,error:message(e)}})}
    }
}
export function createDir(dirId, name) {
    return async dispatch => {
        try {
            await axios.post(`${API_URL}/api/files`, {name,parent:dirId,type:'dir'}, {headers:headers()})
            dispatch(setPopupDisplay('none'))
            return true
        } catch (e) {alert(message(e)); return false}
    }
}
export function uploadFile(file, dirId) {
    return async (dispatch, getState) => {
        const id = `${Date.now()}-${Math.random()}`
        const owner = getState().user.currentUser.id
        const active = () => getState().user.isAuth && getState().user.currentUser.id === owner
        dispatch({type:'UPLOAD_ADD',payload:{id,name:file.name,progress:0,status:'uploading'}})
        try {
            const data = new FormData(); data.append('file',file)
            if (dirId) data.append('parent',dirId)
            await axios.post(`${API_URL}/api/files/upload`,data,{
                headers:headers(), onUploadProgress: event => {
                    if (active() && event.total) dispatch({type:'UPLOAD_UPDATE',payload:{id,progress:Math.round(event.loaded / event.total * 100)}})
                }
            })
            if (!active()) return
            dispatch({type:'UPLOAD_UPDATE',payload:{id,progress:100,status:'done'}})
            dispatch(auth())
            return true
        } catch (e) {
            if (active()) dispatch({type:'UPLOAD_UPDATE',payload:{id,status:'error',error:message(e)}})
            return false
        }
    }
}
export async function downloadFile(file) {
    try {
        const response = await axios.get(`${API_URL}/api/files/download`,{params:{id:file._id},headers:headers(),responseType:'blob'})
        const url = URL.createObjectURL(response.data)
        const link = document.createElement('a'); link.href=url; link.download=file.name
        document.body.appendChild(link); link.click(); link.remove()
        setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch (e) {alert('Не удалось скачать файл')}
}
export function deleteFile(file) {
    return async dispatch => {
        try {
            await axios.delete(`${API_URL}/api/files`,{params:{id:file._id},headers:headers()})
            dispatch(auth()); return true
        } catch (e) {alert(message(e)); return false}
    }
}
