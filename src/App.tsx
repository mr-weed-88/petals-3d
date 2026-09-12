import { ToastContainer } from 'react-toastify'

import Editor from './components/canvas-operations/Editor'

/** ToastContainer is a sibling of the editor so toasts outlive any panel. */
const App = () => {
    return (
        <>
            <ToastContainer />
            <Editor />
        </>
    )
}

export default App
