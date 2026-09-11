import { toast, type ToastOptions } from 'react-toastify'

import { Fade } from '../config/objectsConfig'

const BASE: ToastOptions = {
    position: 'top-center',
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: false,
    progress: undefined,
    theme: 'light',
    transition: Fade,
}

export const notifySuccess = (
    message: string,
    options: ToastOptions = {}
): void => {
    toast.success(message, { ...BASE, autoClose: 1000, ...options })
}

// Errors stay up until dismissed. A failed write means the user's work is
// not stored, which they need to see rather than have flash past.
export const notifyError = (
    message: string,
    options: ToastOptions = {}
): void => {
    toast.error(message, {
        ...BASE,
        autoClose: false,
        closeOnClick: true,
        ...options,
    })
}
