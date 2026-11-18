import React, {useState} from 'react'
import {useDispatch} from 'react-redux'
import dirLogo from '../../../../assets/img/dir.svg'
import fileLogo from '../../../../assets/img/file.svg'
import {deleteFile,downloadFile} from '../../../../actions/file'
import sizeFormat from '../../../../utils/sizeFormat'
import './file.css'
const File = ({file,onOpen,onChanged}) => {
    const dispatch = useDispatch()
    const [busy,setBusy] = useState(false)
    async function remove() {
        if (!window.confirm(`Удалить «${file.name}»?`)) return
        setBusy(true)
        if (await dispatch(deleteFile(file))) onChanged()
        setBusy(false)
    }
    return <div className="file">
        <img className="file__img" src={file.type==='dir'?dirLogo:fileLogo} alt=""/>
        {file.type==='dir'?<button className="file__name file__folder" onClick={()=>onOpen(file)}>{file.name}</button>:<div className="file__name">{file.name}</div>}
        <div className="file__date">{new Date(file.date).toLocaleDateString('ru-RU')}</div>
        <div className="file__size">{file.type==='dir'?'—':sizeFormat(file.size)}</div>
        <div className="file__actions">{file.type!=='dir' && <button onClick={()=>downloadFile(file)} aria-label={'Скачать '+file.name}>Скачать</button>}<button disabled={busy} onClick={remove} aria-label={'Удалить '+file.name}>Удалить</button></div>
    </div>
}
export default File
