const fs = require('fs');
const path = require('path');

// مسار الصورة
const imagePath = path.join(__dirname, 'public', 'profiles', 'transfere.png');

// قراءة الصورة وتحويلها إلى Base64
fs.readFile(imagePath, (err, data) => {
  if (err) {
    console.error('Error reading the image file:', err);
    return;
  }
  const base64Image = data.toString('base64');
  console.log('Base64 Image String:', base64Image);
});