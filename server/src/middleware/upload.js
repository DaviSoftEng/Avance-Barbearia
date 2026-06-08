const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pasta onde as fotos enviadas ficam salvas (server/uploads)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Extensão derivada do tipo do arquivo (não confia no nome original → evita path traversal)
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] || '.jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const uploadMulter = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (EXT_BY_MIME[file.mimetype]) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WEBP.'));
  },
});

// Wrapper que transforma erros do multer (tamanho, tipo) em JSON 400 em vez de HTML 500
function uploadSingleImage(req, res, next) {
  uploadMulter.single('image')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Imagem muito grande (máx. 5 MB).' : err.message;
      return res.status(400).json({ error: msg || 'Erro no upload da imagem' });
    }
    next();
  });
}

module.exports = { uploadSingleImage, uploadsDir };
