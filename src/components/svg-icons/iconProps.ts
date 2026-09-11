/**
 * Props for the hand-drawn icons in this directory.
 *
 * Deliberately identical to the `size` and `color` props `@tabler/icons-react`
 * takes, so a local icon and a Tabler icon are interchangeable at a call site.
 * Generic icons come from Tabler; these are the ones it has no equivalent for
 * (brush profiles, shading modes, guide operations, stylus pressure,
 * transform space).
 */
export interface IconProps {
    /** Any CSS colour. Applied as `fill` or `stroke` depending on the icon. */
    color: string
    /** Rendered width and height in pixels. The viewBox is always 24. */
    size: number
}
