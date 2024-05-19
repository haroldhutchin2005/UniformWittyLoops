const express = require('express');
const axios = require('axios');
const sanitize = require('sanitize-filename');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

let library = [];

// Load existing library
const loadLibrary = async () => {
    try {
        const data = await fs.promises.readFile(`${__dirname}/library.json`, 'utf8');
        library = JSON.parse(data);
    } catch (error) {
        console.error('Error loading library:', error);
    }
};

loadLibrary();

app.use(express.static('public'));
app.use(express.json());

function cleanFileName(fileName) {
    // Replace spaces with _
    fileName = fileName.replace(/\s+/g, '_');
    
    // Remove unfamiliar symbols
    fileName = fileName.replace(/[^\w\s\-.]/g, '');

    return fileName;
}

app.get('/api/upload', async (req, res) => {
    const { link } = req.query;

    if (!link) {
        return res.status(400).send('Link parameter is missing');
    }

    try {
        const response = await axios.get(`https://ytdlbyjonell-0c2a4d00cfcc.herokuapp.com/yt?url=${link}&type=mp4`, {
            responseType: 'arraybuffer'
        });

        const uploadCount = library.length + 1;
        const fileName = `gdpsbotbyjonell+${uploadCount}.m4a`;

        // Clean file name
        const sanitizedFileName = cleanFileName(fileName);

        const filePath = `${__dirname}/${sanitizedFileName}`;

        await fs.promises.writeFile(filePath, Buffer.from(response.data, 'binary'));

        library.push({ link, title: sanitizedFileName });
        await fs.promises.writeFile(`${__dirname}/library.json`, JSON.stringify(library, null, 2));

        res.json({ src: sanitizedFileName });

    } catch (error) {
        console.error('Error downloading YouTube video:', error);
        res.status(500).send('Error downloading YouTube video');
    }
});

app.get('/files', (req, res) => {
    const { src } = req.query;

    if (!src) {
        return res.status(400).send('Source parameter is missing');
    }

    const filePath = `${__dirname}/${src}`;

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('The file does not exist');
    }

    try {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename=${src}`);

        const audioStream = fs.createReadStream(filePath);

        audioStream.pipe(res);

    } catch (error) {
        console.error('Error serving YouTube audio:', error);
        res.status(500).send('Error serving YouTube audio');
    }
});

app.get('/api/library', async (req, res) => {
    try {
        const data = await fs.promises.readFile(`${__dirname}/library.json`, 'utf8');
        library = JSON.parse(data);
        res.json(library);
    } catch (error) {
        console.error('Error reading library:', error);
        res.status(500).send('Error reading library');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
