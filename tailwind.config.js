/*
 * Tailwind v4 does not pick this file up on its own. It is loaded by the
 * `@config` directive at the top of src/App.css.
 *
 * It must be ESM (`export default`, not `module.exports`) because
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
            },

            animation: {
                // react-toastify is handed these class names as plain strings
                // in src/config/objectsConfig.js, so they must keep exactly
                // these names.
                'fade-in': 'fade-in 0.2s ease-out forwards',
                'fade-out': 'fade-out 0.2s ease-in forwards',
                'tooltip-fade-in': 'tooltip-fade-in 0.2s ease-out',
            },
        },
    },
}
