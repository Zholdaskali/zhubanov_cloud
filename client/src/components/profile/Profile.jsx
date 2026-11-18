import React from 'react'
import {useDispatch,useSelector} from 'react-redux'
import {updateAvatar} from '../../actions/user'
import {API_URL} from '../../config'
import sizeFormat from '../../utils/sizeFormat'
const Profile = () => {
    const user=useSelector(state=>state.user.currentUser)
    const dispatch=useDispatch()
    return <section className="profile"><span className="university-eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h2>Профиль</h2>
        <div className="profile-avatar">{user.avatar?<img src={`${API_URL}/static/${user.avatar}`} alt="Ваш аватар"/>:<span>JU</span>}</div>
        <p>{user.email}</p><p>Занято {sizeFormat(user.usedSpace)} из {sizeFormat(user.diskSpace)}</p>
        <progress max={user.diskSpace || 1} value={user.usedSpace || 0}/>
        <div className="profile-actions"><label className="upload-button">Загрузить аватар<input aria-label="Загрузить аватар" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{if(e.target.files[0]) dispatch(updateAvatar(e.target.files[0]));e.target.value=''}}/></label>
        <button disabled={!user.avatar} onClick={()=>dispatch(updateAvatar())}>Удалить аватар</button></div><p className="profile-hint">PNG, JPEG или WebP, до 5 МБ</p>
    </section>
}
export default Profile
