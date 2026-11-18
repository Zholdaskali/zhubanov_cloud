const initialState = {
    files: [], currentDir: null, currentName: 'Мои материалы', popupDisplay: 'none',
    dirStack: [], view: 'list', loading: false, requestId: null, error: '', uploads: []
}
export default function fileReducer(state = initialState, action) {
    switch (action.type) {
        case 'LOGOUT': return {...initialState}
        case 'SET_FILES': return {...state, files: action.payload}
        case 'SET_CURRENT_DIR': return {...state, currentDir: action.payload}
        case 'SET_POPUP_DISPLAY': return {...state, popupDisplay: action.payload}
        case 'OPEN_DIR': return {...state, currentDir: action.payload._id, currentName: action.payload.name, files: [],
            dirStack: [...state.dirStack, {id: state.currentDir, name: state.currentName}]}
        case 'GO_BACK': {
            const previous = state.dirStack[state.dirStack.length - 1]
            return previous ? {...state, currentDir: previous.id, currentName: previous.name, files: [], dirStack: state.dirStack.slice(0, -1)} : state
        }
        case 'GO_ROOT': return {...state, currentDir: null, currentName: 'Мои материалы', dirStack: [], files: []}
        case 'SET_VIEW': return {...state, view: action.payload}
        case 'FILES_REQUEST': return {...state, requestId: action.payload, loading: true, error: ''}
        case 'FILES_RECEIVED': return action.payload.id === state.requestId ? {...state, files: action.payload.files, loading: false} : state
        case 'FILES_FAILED': return action.payload.id === state.requestId ? {...state, error: action.payload.error, loading: false} : state
        case 'UPLOAD_ADD': return {...state, uploads: [...state.uploads, action.payload]}
        case 'UPLOAD_UPDATE': return {...state, uploads: state.uploads.map(file => file.id === action.payload.id ? {...file, ...action.payload} : file)}
        case 'UPLOAD_DISMISS': return {...state, uploads: state.uploads.filter(file => file.id !== action.payload)}
        default: return state
    }
}
export const setFiles = payload => ({type:'SET_FILES',payload})
export const setCurrentDir = payload => ({type:'SET_CURRENT_DIR',payload})
export const setPopupDisplay = payload => ({type:'SET_POPUP_DISPLAY',payload})
export const openDir = payload => ({type:'OPEN_DIR',payload})
export const goBack = () => ({type:'GO_BACK'})
export const setFileView = payload => ({type:'SET_VIEW',payload})
