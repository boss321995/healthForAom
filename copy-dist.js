const fs = require('fs');
const path = require('path');

function copyDirectory(source, destination) {
  try {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
      console.log('📁 Created directory:', destination);
    }

    // Read source directory
    const files = fs.readdirSync(source);
    console.log('📂 Found files in dist:', files);

    // Copy each file
    files.forEach(file => {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
        console.log('✅ Copied:', file);
      }
    });

    console.log('🎉 Successfully copied dist files to server/dist');
    return true;
  } catch (error) {
    console.error('❌ Error copying files:', error.message);
    return false;
  }
}

// Copy dist to server/dist
const success = copyDirectory('./dist', './server/dist');
process.exit(success ? 0 : 1);
