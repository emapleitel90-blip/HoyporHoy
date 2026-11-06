const token = name => `hsl(var(--${name}) / <alpha-value>)`;
const brand = Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(shade => [shade, token(`brand-${shade}`)]));
const status = hue => Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(shade => [shade, `hsl(${hue} var(--status-${shade}) / <alpha-value>)`]));
const statusInk = Object.fromEntries(Object.entries({ red: 5, rose: 350, green: 150, emerald: 155, amber: 38, yellow: 42, orange: 25, purple: 270, violet: 260, pink: 330, teal: 175, cyan: 190, sky: 205 }).map(([name, hue]) => [name, `hsl(${hue} var(--status-ink) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: { sans: ["'Source Sans 3'", 'system-ui', 'sans-serif'], serif: ["'Libre Baskerville'", 'Georgia', 'serif'] },
            colors: {
                background: token('background'), foreground: token('foreground'),
                card: { DEFAULT: token('card'), foreground: token('card-foreground') },
                popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
                primary: { DEFAULT: token('primary'), foreground: token('primary-foreground'), light: token('primary-hover'), dark: token('primary-hover') },
                secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground'), light: token('muted') },
                muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
                accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
                destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
                border: token('border'), input: token('input'), ring: token('ring'),
                link: token('link'), bronze: token('bronze'), indigo: brand, blue: brand,
                red: status(5), rose: status(350), green: status(150), emerald: status(155),
                amber: status(38), yellow: status(42), orange: status(25),
                purple: status(270), violet: status(260), pink: status(330), teal: status(175), cyan: status(190), sky: status(205),
                status: statusInk,
                success: token('success'), warning: token('warning'), danger: token('destructive'),
            },
            borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
        },
    },
    plugins: [require('@tailwindcss/typography')],
};
