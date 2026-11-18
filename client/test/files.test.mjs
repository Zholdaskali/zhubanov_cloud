import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const source=await readFile(new URL('../src/reducers/fileReducer.js',import.meta.url),'utf8')
const {default:reducer}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
test('opening folders and going back preserves history without mutating earlier state',()=>{
 const root=reducer(undefined,{})
 const first=reducer(root,{type:'OPEN_DIR',payload:{_id:'a',name:'Учёба'}})
 const second=reducer(first,{type:'OPEN_DIR',payload:{_id:'b',name:'Лекции'}})
 assert.equal(second.currentDir,'b')
 const back=reducer(second,{type:'GO_BACK'})
 assert.equal(back.currentDir,'a'); assert.equal(second.dirStack.length,2)
 assert.equal(reducer(back,{type:'GO_BACK'}).currentDir,null)
 assert.equal(root.currentDir,null)
})
test('stale file requests do not replace the current folder contents',()=>{
 let state=reducer(undefined,{type:'FILES_REQUEST',payload:'old'})
 state=reducer(state,{type:'FILES_REQUEST',payload:'new'})
 state=reducer(state,{type:'FILES_RECEIVED',payload:{id:'new',files:[{_id:'new-file'}]}})
 state=reducer(state,{type:'FILES_RECEIVED',payload:{id:'old',files:[{_id:'old-file'}]}})
 assert.deepEqual(state.files,[{_id:'new-file'}]); assert.equal(state.loading,false)
})
test('logout clears folder history, files and upload details between accounts',()=>{
 let state=reducer(undefined,{type:'SET_FILES',payload:[{_id:'private'}]})
 state=reducer(state,{type:'OPEN_DIR',payload:{_id:'private',name:'Private'}})
 state=reducer(state,{type:'LOGOUT'})
 assert.deepEqual(state.files,[]); assert.equal(state.currentDir,null); assert.deepEqual(state.dirStack,[])
})
