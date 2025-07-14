const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

async function ensureBucket(bucketName) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
  } catch (err) {
    if (err.name !== 'BucketAlreadyOwnedByYou') throw err;
  }
}

module.exports = { s3, ensureBucket }; 