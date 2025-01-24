const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const baseUrl = process.env.API_URL;
const privateKey = process.env.API_PRIVATE_KEY;
const publicKey = process.env.API_PUBLIC_KEY;
const ts = Date.now();
const hash = createHash(ts, privateKey, publicKey);

const comicIds = [
    33281, // Ultimate Invasion (2023)
    38806, // Ultimate Black Panther (2024)
    38809, // Ultimate Spider-Man (2024)
    38817, // Ultimate X-Men (2024)
    38865, // Ultimates (2024)
    39137, // Free Comic Book Day (2024)
    39482, // Ultimate Universe (2023)
    42887, // Ultimate Universe: One Year In (2024)
    42303, // Ultimate Wolverine (2025)
];

async function fetchData() {
    const newData = await Promise.all(comicIds.map(id => parseSeries(id)));
    try {
        const oldData = JSON.parse(fs.readFileSync('./docs/data.json', 'utf-8'));
        if (JSON.stringify(oldData) == JSON.stringify(newData)) {
            console.log('Data unchanged. Skipping commit');
            return;
        }
    } catch (error) {
        // If './docs/data.json' doesn't exist, it's always a new update
    }

    const meta = {
        'last_update': ts,
    };

    fs.writeFileSync('./docs/data.json', JSON.stringify(newData, null, 0));
    fs.writeFileSync('./docs/meta.json', JSON.stringify(meta, null, 0));
}

async function parseSeries(seriesId) {
    const series = await getSeries(seriesId);
    const issues = await getIssues(seriesId, 0);
    return (({
        title,
        thumbnail,
        attributionText,
    }) => ({
        id: seriesId,
        title,
        thumbnail: imageString(thumbnail),
        issues: issues.map(issue => (({
            id,
            title,
            issueNumber,
            description,
            dates,
            thumbnail,
            urls,
        }) => ({
            id,
            title,
            issueNumber,
            description,
            date: findDate(dates, 'onsaleDate'),
            thumbnail: imageString(thumbnail),
            detailUrl: findUrlOrFirst(urls, 'detail'),
        }))(issue)),
        attributionText,
    }))(series);
}

function findUrlOrFirst(urls, type) {
    if (urls.length < 1) {
        return null;
    }
    const matching = urls.find((url) => url.type === type);
    const url = matching || urls[0];
    return url.url;
}

function findDate(dates, type) {
    const onSaleDate = dates.find((date) => date.type === type);
    return onSaleDate ? onSaleDate.date : '';
}

function imageString({ path, extension }) {
    return `${path.replace('http://', 'https://')}.${extension}`;
}

async function getSeries(seriesId) {
    const parsedUrl = `${baseUrl}v1/public/series/${seriesId}?ts=${ts}&apikey=${publicKey}&hash=${hash}`;
    try {
        const response = await axios.get(parsedUrl);
        const data = response.data;
        if (data.data.results.length > 0) {
            const results = data.data.results[0];
            results.attributionText = data.attributionText;
            return results;
        }
    } catch (error) {
        console.error(`Error fetching series ${seriesId}`, error);
    }
}

async function getIssues(seriesId, offset = 0) {
    const parsedUrl = `${baseUrl}v1/public/series/${seriesId}/comics?ts=${ts}&apikey=${publicKey}&hash=${hash}&noVariants=true&format=comic&orderBy=issueNumber&limit=100&offset=${offset}`;
    try {
        const response = await axios.get(parsedUrl);
        const data = response.data.data;
        const total = data.total;
        const currentCount = offset + data.count;
        const results = data.results;

        if (total > currentCount) {
            return results.concat(await getIssues(seriesId, currentCount));
        } else {
            return results;
        }
    } catch (error) {
        console.error(`Error fetching issues ${seriesId}`, error);
    }
}

function createHash(ts, privateKey, publicKey) {
    return crypto.createHash('md5').update(`${ts}${privateKey}${publicKey}`).digest('hex');
}

fetchData();
