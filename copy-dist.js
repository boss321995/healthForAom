const fs = require('fs');
const path = require('path');

function copyDirectory(source, destination) {
  try {
    console.log('🔧 Copy process starting...');
    console.log('📁 Source:', path.resolve(source));
    console.log('📁 Destination:', path.resolve(destination));
    console.log('📁 Current working directory:', process.cwd());
    
    // Check if source exists
    if (!fs.existsSync(source)) {
      console.error('❌ Source directory does not exist:', source);
      const rootDist = path.join(process.cwd(), 'dist');
      console.log('🔍 Checking root dist at:', rootDist);
      if (fs.existsSync(rootDist)) {
        console.log('✅ Found dist in root, using that instead');
        source = rootDist;
      } else {
        console.error('❌ No dist folder found anywhere');
        return false;
      }
    }

    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
      console.log('📁 Created directory:', destination);
    }

    // Read source directory
    const files = fs.readdirSync(source);
    console.log('📂 Found files in source:', files);

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

    console.log('🎉 Successfully copied dist files to', destination);
    return true;
  } catch (error) {
    console.error('❌ Error copying files:', error.message);
    console.error('❌ Stack:', error.stack);
    return false;
  }
}

// Try multiple possible source locations
const possibleSources = [
  './dist',
  '../dist', 
  '../../dist',  // For Render: /opt/render/project/src/server -> /opt/render/project/src/dist
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), '../dist'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, '../dist')
];

const possibleDestinations = [
  './server/dist',
  './dist',  // If we're already in server directory
  path.join(__dirname, 'dist')  // Server directory dist
];

console.log('🚀 Starting copy-dist process...');
console.log('📁 Working directory:', process.cwd());
console.log('📁 Script directory:', __dirname);

let success = false;
for (const source of possibleSources) {
  console.log(`🔍 Trying source: ${source}`);
  if (fs.existsSync(source)) {
    console.log(`✅ Found dist at: ${source}`);
    
    // Try different destination paths
    for (const dest of possibleDestinations) {
      try {
        console.log(`📁 Trying destination: ${dest}`);
        success = copyDirectory(source, dest);
        if (success) {
          console.log(`🎉 Successfully copied to: ${dest}`);
          break;
        }
      } catch (err) {
        console.log(`❌ Failed to copy to ${dest}:`, err.message);
      }
    }
    
    if (success) break;
  } else {
    console.log(`❌ Not found: ${source}`);
  }
}

if (!success) {
  console.error('❌ Failed to copy dist files from any location');
  process.exit(1);
} else {
  console.log('🎉 Copy process completed successfully!');
  process.exit(0);
}
