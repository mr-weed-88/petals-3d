import type { ReactNode } from 'react'
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

/** Stable id, so the prompt can be dismissed once answered and never raised twice. */
export const POINTER_PROMPT = 'pointer-prompt'

/**
 * A standing instruction rather than a notification: it waits until the user
 * acts on it. Takes a node so the caller can supply its own icon and markup.
 */
export const notifyInfo = (
    message: ReactNode,
    options: ToastOptions = {}
): void => {
    toast.info(message, {
        ...BASE,
        autoClose: false,
        // The caller draws its own icon; the library's would be a second one.
        icon: false,
        ...options,
    })
}

export const dismissNotice = (id: string): void => {
    toast.dismiss(id)
}

// Errors stay up until dismissed. A failed write means the user's work is not
// stored, which they need to see rather than have flash past.
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
