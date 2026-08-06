const https = require('https');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

(async () => {
    try {
        const query = encodeURIComponent('accidente laboral');
        const url = `https://www.saij.gob.ar/busqueda?q=${query}`;
        console.log('Fetching:', url);

        const html = await fetchUrl(url);

        // Let's print the first 2000 chars of the body
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            console.log('Body snippet:', bodyMatch[1].substring(0, 2000).replace(/\s+/g, ' '));

            // Look for results container or repeating list items
            const results = html.match(/class="[^"]*resultado[^"]*"|<li[^>]*class="[^"]*lista[^"]*"|<div[^>]*class="[^"]*search-result[^"]*"/ig);
            console.log('Found potential result containers:', results ? results.length : 0);

            // Look for jurisprudencia links
            const juriLinks = [...html.matchAll(/href="([^"]+jurisprudencia[^"]+)"/ig)].slice(0, 5);
            console.log('Jurisprudencia links sample:');
            juriLinks.forEach(l => console.log('  ', l[1]));
        } else {
            console.log('No body found, raw snippet:', html.substring(0, 1000));
        }

    } catch (e) {
        console.error('Error:', e);
    }
})();
stop