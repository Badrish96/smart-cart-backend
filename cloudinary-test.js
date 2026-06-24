const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'dngdl83of',
  api_key: '724541974262354',
  api_secret: 'q-07fQfp2TFMeRZhbRzdzfGklRw',
});

async function main() {
  // 1. Upload a sample image from Cloudinary's demo account
  console.log('Uploading image...');
  const uploadResult = await cloudinary.uploader.upload(
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    { public_id: 'smart_cart_sample' }
  );

  console.log('Secure URL:  ', uploadResult.secure_url);
  console.log('Public ID:   ', uploadResult.public_id);

  // 2. Fetch and print image metadata
  console.log('\nFetching image details...');
  const details = await cloudinary.api.resource(uploadResult.public_id);

  console.log('Width:       ', details.width, 'px');
  console.log('Height:      ', details.height, 'px');
  console.log('Format:      ', details.format);
  console.log('File size:   ', details.bytes, 'bytes');

  // 3. Generate a transformed URL
  //    f_auto — Cloudinary picks the best format for the user's browser (e.g. WebP, AVIF)
  //    q_auto — Cloudinary picks the best quality level to reduce file size without visible loss
  const transformedUrl = cloudinary.url(uploadResult.public_id, {
    fetch_format: 'auto',
    quality: 'auto',
  });

  console.log('\nDone! Click link below to see optimized version of the image. Check the size and the format.');
  console.log('Transformed URL:', transformedUrl);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
