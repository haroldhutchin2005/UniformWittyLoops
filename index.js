const express = require('express');
const axios = require('axios');
const ytdl = require('ytdl-core');
const sanitize = require('sanitize-filename');
const fs = require('fs');
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

app.get('/api/upload', (req, res) => {
    const { link } = req.query;

    if (!link) {
        return res.status(400).send('Link parameter is missing');
    }

    if (!ytdl.validateURL(link)) {
        return res.status(400).send('Invalid YouTube link');
    }

    ytdl.getInfo(link, (err, info) => {
        if (err) {
            console.error('Error fetching YouTube video info:', err);
            return res.status(500).send('Error fetching YouTube video info');
        }

        const title = sanitize(info.videoDetails.title);

        axios.get(`https://deku-rest-api.replit.app/ytdl?url=${link}&type=mp4`, { responseType: 'arraybuffer' })
            .then(response => {
                let fileName = `${title}.mp3`;
                fileName = cleanFileName(fileName);
                const filePath = `${__dirname}/${fileName}`;
                fs.writeFile(filePath, Buffer.from(response.data, 'binary'), (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                        return res.status(500).send('Error writing file');
                    }

                    library.push({ link, title });
                    fs.writeFile(`${__dirname}/library.json`, JSON.stringify(library, null, 2), (err) => {
                        if (err) {
                            console.error('Error writing library file:', err);
                            return res.status(500).send('Error writing library file');
                        }
                        res.json({ src: fileName });
                    });
                });
            })
            .catch(error => {
                console.error('Error downloading YouTube video:', error);
                res.status(500).send('Error downloading YouTube video');
            });
    });
});

app.get('/files', (req, res) => {
    const { src } = req.query;

    if (!src) {
        return res.status(400).send('Source parameter is missing');
    }

    const filePath = `${__dirname}/${src}`;

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File not found:', err);
            return res.status(404).send('File not found');
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename=${src}`);

        const audioStream = fs.createReadStream(filePath);
        audioStream.pipe(res);
    });
});

app.get('/api/library', (req, res) => {
    fs.readFile(`${__dirname}/library.json`, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading library:', err);
            return res.status(500).send('Error reading library');
        }
        library = JSON.parse(data);
        res.json(library);
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
