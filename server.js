const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();

app.use(cors());

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    return res.status(200).json({ url: `/uploads/${req.file.filename}` });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
