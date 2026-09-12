import { cssTransition } from 'react-toastify'

import type { GuideObjectType, LineObjectType } from '../types/domain'

/** Object types the eraser and the line selection act on. */
export const eraseLineType: readonly LineObjectType[] = ['LINE', 'MERGED_LINE']

/** Object types the loft tool will accept as input curves. */
export const loftGuideLineType: readonly LineObjectType[] = ['LINE']

/** Scaffolding types, cleared wholesale and never persisted. */
export const guideObjectType: readonly GuideObjectType[] = [
    'LOFT_SURFACE',
    'OG_GUIDE_PLANE',
    'BEND_GUIDE_PLANE',
    'DYNAMIC_GUIDE_LINE',
]

/** Toast transition. These class names are defined in tailwind.config.js. */
export const Fade = cssTransition({
    enter: 'animate-fade-in',
    exit: 'animate-fade-out',
})
