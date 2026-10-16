const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const accountId = 'a550392841f9c91bf24e0cf7b3d7de5f';
const projectName = 'goalstreet';
const distDir = path.resolve(__dirname, 'dist');

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.webmanifest': return 'application/manifest+json; charset=utf-8';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

function getAllFiles(dir, base = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const relPath = base ? `${base}/${file}` : file;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath: `/${relPath}` });
    }
  }
  return results;
}

async function main() {
  console.log('Deploying Goalstreet to Cloudflare Pages via Direct Upload API...');

  // 1. Get files & hashes
  const files = getAllFiles(distDir);
  const manifest = {};
  const fileMap = new Map();

  for (const f of files) {
    const buf = fs.readFileSync(f.fullPath);
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    manifest[f.relPath] = hash;
    fileMap.set(hash, {
      key: hash,
      value: buf.toString('base64'),
      metadata: { contentType: getMimeType(f.fullPath) },
      base64: true,
    });
  }

  console.log(`Found ${files.length} files in dist directory.`);
  fs.writeFileSync(path.resolve(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Write files info for Cloudflare execute runner
  fs.writeFileSync(path.resolve(__dirname, 'upload_payload.json'), JSON.stringify(Array.from(fileMap.values())));
  console.log('Ready for Cloudflare deployment step.');
}

main().catch(console.error);
