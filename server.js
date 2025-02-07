const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log(`Created uploads directory at ${uploadDir}`);
}

// Configure multer for file uploads with restrictions
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, file.originalname),
});

// Allowed MIME types including video formats
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/avi',
  'video/quicktime',
  'video/mpeg',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/webm',
  'video/mov'
];

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB file size limit
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and common video files are allowed.'));
    }
  }
});

// Middleware
const corsOptions = {
  origin: 'https://led.peridotgrand.com', // Allow your frontend domain
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true // Include cookies if needed
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(express.json());

// Function to execute shell commands
const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    exec(command, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Command: "${command}" completed in ${duration}ms`);
      if (error) {
        console.error(`[${new Date().toISOString()}] Error: ${stderr || error.message}`);
        return reject(new Error(`Command failed: "${command}". Error: ${stderr || error.message}`));
      }
      resolve(stdout);
    });
  });
};

// Function to validate devices
const validateDevices = (devices) => {
  const allowedDevices = ['10.3.12.107', '10.3.12.105']; // Example whitelist
  const invalidDevices = devices.filter(device => !allowedDevices.includes(device));
  return {
    isValid: invalidDevices.length === 0,
    invalidDevices
  };
};

// Route to push media to Android devices
app.post('/push-media', upload.array('files'), async (req, res) => {
  let devices;
  try {
    devices = JSON.parse(req.body.devices);
    if (!Array.isArray(devices)) {
      throw new Error('Devices should be an array.');
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Invalid devices format: ${err.message}`);
    return res.status(400).json({ error: 'Invalid devices format. It should be a JSON array of device IPs.' });
  }

  const { isValid, invalidDevices } = validateDevices(devices);
  if (!isValid) {
    console.error(`[${new Date().toISOString()}] Invalid devices attempted: ${invalidDevices.join(', ')}`);
    return res.status(400).json({ error: `Invalid device(s) selected: ${invalidDevices.join(', ')}` });
  }

  if (!req.files || req.files.length === 0) {
    console.error(`[${new Date().toISOString()}] No files uploaded.`);
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  try {
    await Promise.all(devices.map(async (device) => {
      await executeCommand(`adb connect ${device}:5555`);
      await executeCommand(`adb -s ${device} shell rm -rf /sdcard/zcapp/zcplayer/standalone/Screen1/*`);
      for (const file of req.files) {
        const filePath = path.join(uploadDir, file.originalname);
        await executeCommand(`adb -s ${device} push "${filePath}" /sdcard/zcapp/zcplayer/standalone/Screen1/`);
      }
      await executeCommand(`adb -s ${device} shell am force-stop com.linux.vshow`);
      await executeCommand(`adb -s ${device} shell monkey -p com.linux.vshow -c android.intent.category.LAUNCHER 1`);
    }));
    res.json({ message: 'Files pushed successfully to all devices.' });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during processing: ${error.message}`);
    res.status(500).json({ error: error.message });
  } finally {
    req.files.forEach(file => {
      const filePath = path.join(uploadDir, file.originalname);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`[${new Date().toISOString()}] Failed to delete file ${file.originalname}:`, err);
        }
      });
    });
  }
});

// Global error handler for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error(`[${new Date().toISOString()}] Multer error: ${err.message}`);
    return res.status(400).json({ error: err.message });
  } else if (err) {
    console.error(`[${new Date().toISOString()}] Server error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
