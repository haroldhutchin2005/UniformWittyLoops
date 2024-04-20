const express = require('express');
const axios = require('axios');
const ytdl = require('ytdl-core');
const sanitize = require('sanitize-filename');
const fs = require('fs').promises; // Using promises for fs
const app = express();
const port = process.env.PORT || 8080;

let library = [];

app.use(express.static('public'));
app.use(express.json());

function cleanFileName(fileName) {
    fileName = fileName.replace(/\s+/g, '_');
    fileName = fileName.replace(/[^\w\s\-.]/g, '');
    return fileName;
}

app.get('/api/upload', async (req, res) => {
    const { link } = req.query;

    if (!link) {
        return res.status(400).send('Link parameter is missing');
    }

    try {
        if (!ytdl.validateURL(link)) {
            return res.status(400).send('Invalid YouTube link');
        }

        const info = await ytdl.getInfo(link);
        const title = sanitize(info.videoDetails.title);

        const response = await axios.get(`https://deku-rest-api.replit.app/ytdl?url=${link}&type=mp4`, {
            responseType: 'arraybuffer'
        });

        let fileName = `${title}.mp3`;
        fileName = cleanFileName(fileName);

        const filePath = `${__dirname}/${fileName}`;

        await fs.writeFile(filePath, Buffer.from(response.data, 'binary'));

        library.push({ link, title });
        await fs.writeFile(`${__dirname}/library.json`, JSON.stringify(library, null, 2));

        res.json({ src: fileName });

    } catch (error) {
        console.error('Error downloading YouTube video:', error);
        res.status(500).send('Error downloading YouTube video');
    }
});

app.get('/files', async (req, res) => {
    const { src } = req.query;

    if (!src) {
        return res.status(400).send('Source parameter is missing');
    }

    try {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename=${src}`);

        const filePath = `${__dirname}/${src}`;
        const exists = await fs.access(filePath)
            .then(() => true)
            .catch(() => false);

        if (!exists) {
            return res.status(400).send('File not found');
        }

        const audioStream = fs.createReadStream(filePath);
        audioStream.pipe(res);

    } catch (error) {
        console.error('Error serving YouTube audio:', error);
        res.status(500).send('Error serving YouTube audio');
    }
});

app.get('/api/library', async (req, res) => {
    try {
        const data = await fs.readFile(`${__dirname}/library.json`, 'utf8');
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
