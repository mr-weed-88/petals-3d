/*
 * Tailwind v4 does not pick this file up on its own: it is loaded by the
 * `@config` directive at the top of src/App.css. It must be ESM, because
 * package.json declares "type": "module".
 */
export default {
    theme: {
        screens: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
        },
        extend: {
            /*
             * Semantic colours, backed by the custom properties in src/App.css
             * and flipped by the `.dark` class on <html>. Because the value is
             * a variable, one class covers both themes and no `dark:` variant
             * is needed. Opacity modifiers still work (`border-line/25`):
             * Tailwind v4 applies them with color-mix.
             */
            colors: {
                surface: 'var(--c-surface)',
                'surface-2': 'var(--c-surface-2)',
                'surface-3': 'var(--c-surface-3)',
                ink: 'var(--c-ink)',
                'ink-muted': 'var(--c-ink-muted)',
                line: 'var(--c-line)',
                accent: 'var(--c-accent)',
                'accent-ink': 'var(--c-accent-ink)',
                overlay: 'var(--c-overlay)',

                // Fixed across themes: these carry meaning rather than style.
                'axis-x': '#DE3163',
                'axis-y': '#50C878',
                'axis-z': '#0096FF',
                success: '#16B826',
                danger: '#7F2315',
                // Sits on top of `danger`. White in both themes: the red is
                // dark enough that light text is the only readable choice.
                'danger-ink': '#FFFFFF',
            },

            fontFamily: {
                funnel: ["'Funnel Sans'", 'sans-serif'],
            },

            keyframes: {
                'fade-in': {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                'fade-out': {
                    from: { opacity: '1', transform: 'scale(1)' },
                    to: { opacity: '0', transform: 'scale(0.95)' },
                },
                'tooltip-fade-in': {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                // The modal pop. Rises and grows into place rather than only
                // fading, so it reads as arriving in front of the editor.
                'modal-in': {
                    from: {
                        opacity: '0',
                        transform: 'translateY(12px) scale(0.96)',
                    },
                    to: {
                        opacity: '1',
                        transform: 'translateY(0) scale(1)',
                    },
                },
                // The dimmer behind it. Opacity only: scaling a full-viewport
                // backdrop would show the edges of the canvas underneath.
                'overlay-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
            },

            animation: {
                // react-toastify is handed these names as plain strings in
                // src/config/objectsConfig.ts, so they cannot be renamed.
                'fade-in': 'fade-in 0.2s ease-out forwards',
                'fade-out': 'fade-out 0.2s ease-in forwards',
                'tooltip-fade-in': 'tooltip-fade-in 0.2s ease-out',

                // `backwards` holds the from-state during the frame before the
                // animation starts, which stops the modal flashing at full
                // size on mount.
                'modal-in':
                    'modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) backwards',
                'overlay-in': 'overlay-in 0.2s ease-out backwards',
            },
        },
    },
}
