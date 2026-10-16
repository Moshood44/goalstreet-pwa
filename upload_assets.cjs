const fs = require('fs');
const path = require('path');

const uploadPayload = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'upload_payload.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'manifest.json'), 'utf8'));

async function uploadAssets(jwt) {
  console.log('1. Checking missing hashes with upload token JWT...');
  const hashes = Object.values(manifest);

  const checkRes = await fetch('https://api.cloudflare.com/client/v4/pages/assets/check-missing', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hashes }),
  });

  const checkJson = await checkRes.json();
  console.log('Check missing response:', JSON.stringify(checkJson));

  if (!checkJson.success) {
    throw new Error('Check missing failed: ' + JSON.stringify(checkJson.errors));
  }

  const missingHashes = new Set(checkJson.result || []);
  console.log(`Missing hashes to upload: ${missingHashes.size} of ${hashes.length}`);

  if (missingHashes.size > 0) {
    const filesToUpload = uploadPayload.filter(item => missingHashes.has(item.key));
    console.log(`Uploading ${filesToUpload.length} files...`);

    const uploadRes = await fetch('https://api.cloudflare.com/client/v4/pages/assets/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filesToUpload),
    });

    const uploadJson = await uploadRes.json();
    console.log('Upload response:', JSON.stringify(uploadJson));
    if (!uploadJson.success) {
      throw new Error('Upload failed: ' + JSON.stringify(uploadJson.errors));
    }
  }

  // Upsert hashes
  console.log('Upserting hashes...');
  const upsertRes = await fetch('https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hashes }),
  });
  const upsertJson = await upsertRes.json();
  console.log('Upsert response:', JSON.stringify(upsertJson));

  return true;
}

// Read JWT from command line argument
const jwt = process.argv[2];
if (!jwt) {
  console.error('Please pass JWT as argument');
  process.exit(1);
}

uploadAssets(jwt).catch(err => {
  console.error('Asset upload error:', err);
  process.exit(1);
});
