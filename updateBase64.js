const fs = require('fs');
const path = require('path');

// مسار الصورة
const imagePath = path.join(__dirname, 'public', 'profiles', 'transfere.png');
const htmlFilePath = path.join(__dirname, 'public', 'profiles.html');

function updateBase64InHtml() {
  // قراءة الصورة وتحويلها إلى Base64
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error('Error reading the image file:', err);
      return;
    }
    const base64Image = data.toString('base64');

    // تحديث ملف profiles.html
    fs.readFile(htmlFilePath, 'utf8', (err, htmlData) => {
      if (err) {
        console.error('Error reading the HTML file:', err);
        return;
      }

      const updatedHtml = htmlData.replace(/data:image\/png;base64,[^"']*/, `data:image/png;base64,${base64Image}`);

      fs.writeFile(htmlFilePath, updatedHtml, 'utf8', (err) => {
        if (err) {
          console.error('Error writing to the HTML file:', err);
          return;
        }
      });
    });
  });
}

// تشغيل التحديث كل 10 ثوانٍ
setInterval(updateBase64InHtml, 10000);