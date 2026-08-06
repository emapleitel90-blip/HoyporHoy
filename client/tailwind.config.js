/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0f172a', // Navy Blue (Slate 900)
                    light: '#334155',
                },
                secondary: {
                    DEFAULT: '#64748b', // Grey (Slate 500)
                    light: '#94a3b8',
                },
                accent: {
                    DEFAULT: '#3b82f6', // Blue
                },
                success: '#22c55e',
                warning: '#eab308',
                danger: '#ef4444',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
