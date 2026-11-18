import React, {useEffect, useRef, useState} from 'react'
import {useDispatch, useSelector} from 'react-redux'
import {getFiles, uploadFile} from '../../actions/file'
import FileList from './fileList/FileList'
import Popup from './Popup'
import {goBack, openDir, setFileView, setPopupDisplay} from '../../reducers/fileReducer'
import './disk.css'

const Disk = () => {
    const dispatch = useDispatch()
    const {currentDir,currentName,dirStack,view,loading,error,uploads} = useSelector(state=>state.files)
    const [search,setSearch] = useState('')
    const [query,setQuery] = useState('')
    const [sort,setSort] = useState('name')
    const [dragging,setDragging] = useState(false)
    const [revision,setRevision] = useState(0)
    const dragDepth = useRef(0)
    useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),250); return ()=>clearTimeout(timer)},[search])
    useEffect(()=>{dispatch(getFiles(currentDir,sort,query))},[currentDir,sort,query,revision,dispatch])
    const refresh = () => setRevision(value=>value+1)
    async function upload(files) {
        const destination = currentDir
        for (const file of Array.from(files)) await dispatch(uploadFile(file,destination))
        refresh()
    }
    function open(file) {setSearch('');setQuery('');dispatch(openDir(file))}
    function back() {setSearch('');setQuery('');dispatch(goBack())}
    return (
        <div className={'disk'+(dragging?' disk--dragging':'')}
            onDragEnter={e=>{e.preventDefault(); if (e.dataTransfer.types.includes('Files')) {dragDepth.current++;setDragging(true)}}}
            onDragLeave={e=>{e.preventDefault();if (--dragDepth.current<=0){dragDepth.current=0;setDragging(false)}}}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();dragDepth.current=0;setDragging(false);upload(e.dataTransfer.files)}}>
            <div className="disk__heading"><div><span className="university-eyebrow">ЛИЧНОЕ ПРОСТРАНСТВО</span><h2>{currentName}</h2></div></div>
            <nav className="disk__breadcrumbs" aria-label="Путь к папке">
                <button onClick={()=>{setSearch('');setQuery('');dispatch({type:'GO_ROOT'})}}>Мой диск</button>
                {dirStack.filter(dir=>dir.id).map(dir=><span key={dir.id}> / {dir.name}</span>)}
                {currentDir && <span> / {currentName}</span>}
            </nav>
            <div className="disk__btns">
                <button className="disk__back" disabled={!dirStack.length} onClick={back}>Назад</button>
                <button className="disk__create" onClick={()=>dispatch(setPopupDisplay('flex'))}>Создать папку</button>
                <label className="upload-button">Загрузить файлы<input aria-label="Загрузить файлы" type="file" multiple onChange={e=>{upload(e.target.files);e.target.value=''}}/></label>
                <select aria-label="Сортировка" value={sort} onChange={e=>setSort(e.target.value)}>
                    <option value="name">По имени</option><option value="type">По типу</option><option value="date">Сначала новые</option>
                </select>
                <div className="view-switch"><button aria-label="Список" aria-pressed={view==='list'} onClick={()=>dispatch(setFileView('list'))}>☰</button><button aria-label="Плитка" aria-pressed={view==='plate'} onClick={()=>dispatch(setFileView('plate'))}>▦</button></div>
            </div>
            <input className="disk-search" type="search" placeholder="Поиск по всему диску…" aria-label="Поиск файлов" value={search} onChange={e=>setSearch(e.target.value)}/>
            {query && <p className="search-caption">Результаты поиска по всему диску: «{query}»</p>}
            {loading && <div className="disk-status" role="status"><span className="spinner"/> Загрузка…</div>}
            {error && <div className="disk-error" role="alert">{error} <button onClick={refresh}>Повторить</button></div>}
            {!loading && !error && <FileList onOpen={open} onChanged={refresh} searching={!!query}/>}
            <Popup onCreated={refresh}/>
            {dragging && <div className="drop-area">Отпустите файлы для загрузки в эту папку</div>}
            {!!uploads.length && <section className="uploader" aria-label="Прогресс загрузки"><h3>Загрузка файлов</h3>{uploads.map(file=><div className="upload-item" key={file.id}>
                <div><strong>{file.name}</strong>{file.status!=='uploading' && <button aria-label={'Закрыть '+file.name} onClick={()=>dispatch({type:'UPLOAD_DISMISS',payload:file.id})}>×</button>}</div>
                <progress max="100" value={file.progress}/><span role={file.status==='error'?'alert':undefined}>{file.status==='done'?'Загружено':file.status==='error'?file.error:file.progress===100?'Сохранение…':file.progress+'%'}</span>
            </div>)}</section>}
        </div>
    )
}
export default Disk
