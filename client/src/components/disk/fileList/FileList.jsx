import React from 'react'
import {useSelector} from 'react-redux'
import File from './file/File'
import './fileList.css'
const FileList = ({onOpen,onChanged,searching}) => {
    const {files,view} = useSelector(state=>state.files)
    if (!files.length) return <div className="empty-disk"><span aria-hidden="true">▱</span><h3>{searching?'Ничего не найдено':'Здесь начнётся ваша коллекция знаний'}</h3><p>{searching?'Попробуйте другое название.':'Создайте папку или перетащите сюда учебные материалы.'}</p></div>
    return <div className={view==='plate'?'fileplate':'filelist'}>
        {view==='list' && <div className="filelist__header"><div className="filelist__name">Название</div><div className="filelist__date">Дата</div><div className="filelist__size">Размер</div></div>}
        {files.map(file=><File key={file._id} file={file} onOpen={onOpen} onChanged={onChanged}/>)}
    </div>
}
export default FileList
