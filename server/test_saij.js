const axios = require('axios');
const cheerio = require('cheerio');

async function searchSAIJ(query) {
    try {
        // Encode the query
        const q = encodeURIComponent(query);
        // Typical SAIJ search URL
        const url = `http://www.saij.gob.ar/busqueda?q=${q}`;
        console.log('Fetching:', url);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const $ = cheerio.load(response.data);
        const results = [];
        
        // Inspecting typical list items in SAIJ
        $('.resultado-busqueda, .search-result, .list-group-item, li.row').each((i, el) => {
            const title = $(el).find('h3, h4, .titulo').text().trim();
            const link = $(el).find('a').attr('href');
            const summary = $(el).find('p, .resumen').text().trim();
            
            if (title && link) {
                results.push({
                    title,
                    link: link.startsWith('http') ? link : `http://www.saij.gob.ar${link}`,
                    summary
                });
            }
        });

        // If selectors failed, let's dump an excerpt of the body
        if (results.length === 0) {
            console.log("No results found with standard selectors. Here's a snippet of the HTML:");
            const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 500);
            console.log(bodyText);
            
            // Try to find any anchors with '/jurisprudencia/' or similar inside
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.includes('jurisprudencia')) {
                    const t = $(el).text().trim();
                    if (t) console.log("Potential jurisprudencia link:", href, t.substring(0, 50));
                }
            });
        }
        
        console.log('Results:', results);
    } catch (error) {
        console.error('Error fetching SAIJ:', error.message);
    }
}

searchSAIJ('estafa');
