import { toast } from 'react-toastify'

import { Fade } from '../config/objectsConfig'

const BASE = {
    position: 'top-center',
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: false,
    progress: undefined,
    theme: 'light',
    transition: Fade,
}

export const notifySuccess = (message, options = {}) =>
    toast.success(message, { ...BASE, autoClose: 1000, ...options })

// Errors stay up until dismissed. A failed write means the user's work is
// not stored, which they need to see rather than have flash past.
export const notifyError = (message, options = {}) =>
    toast.error(message, {
        ...BASE,
        autoClose: false,
        closeOnClick: true,
        ...options,
    })
