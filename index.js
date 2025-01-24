const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.API_URL;
const privateKey = process.env.API_PRIVATE_KEY;
const publicKey = process.env.API_PUBLIC_KEY;

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
    const dataFilePath = path.join(__dirname, 'docs', 'data.json');
    const metaFilePath = path.join(__dirname, 'docs', 'meta.json');

    try {
        const newData = await Promise.all(comicIds.map(id => parseSeries(id)));

        if (fs.existsSync(dataFilePath)) {
            console.log('Old files exist');
            const oldData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
            if (JSON.stringify(oldData) == JSON.stringify(newData)) {
                console.log('Data unchanged. Skipping update.');
                return;
            }
        } else {
            console.log('Old files don\'t exist. Building directory if needed');
            fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
        }

        const ts = Date.now();
        const meta = { last_update: ts };

        fs.writeFileSync(dataFilePath, JSON.stringify(newData, null, 0));
        fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 0));

        console.log('Data updated successfully.');
    } catch (error) {
        console.error('Error fetching or processing data:', error);
        process.exist(1);
    }
}

async function parseSeries(seriesId) {
    try {
        const series = await getSeries(seriesId);
        const issues = await getIssues(seriesId);
        return {
            id: seriesId,
            title: series.title,
            thumbnail: imageString(series.thumbnail),
            issues: issues.map(issue => ({
                id: issue.id,
                title: issue.title,
                issueNumber: issue.issueNumber,
                description: issue.description,
                date: findDate(issue.dates, 'onsaleDate'),
                thumbnail: imageString(issue.thumbnail),
                detailUrl: findUrlOrFirst(issue.urls, 'detail'),
            })),
            attributionText: series.attributionText,
        };
    } catch(error) {
        console.error(`Error processing series: ${seriesId}:`, error);
        return null;
    }
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
    console.log(`Getting series ${seriesId}`);
    const ts = Date.now();
    const hash = createHash(ts, privateKey, publicKey);
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

async function getIssues(seriesId, offset = 0, allIssues = []) {
    console.log(`Getting issues for series ${seriesId}`);
    const ts = Date.now();
    const hash = createHash(ts, privateKey, publicKey);
    const parsedUrl = `${baseUrl}v1/public/series/${seriesId}/comics?ts=${ts}&apikey=${publicKey}&hash=${hash}&noVariants=true&format=comic&orderBy=issueNumber&limit=100&offset=${offset}`;
    try {
        const response = await axios.get(parsedUrl);
        const data = response.data.data;
        const total = data.total;
        const currentCount = offset + data.count;
        const results = data.results;

        allIssues.push(...results);

        if (total > currentCount) {
            return getIssues(seriesId, currentCount, allIssues);
        } else {
            return allIssues;
        }
    } catch (error) {
        console.error(`Error fetching issues ${seriesId} (offset ${offset}):`, error);
    }
}

function createHash(ts, privateKey, publicKey) {
    return crypto.createHash('md5').update(`${ts}${privateKey}${publicKey}`).digest('hex');
}

fetchData();
