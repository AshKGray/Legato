const { s3 } = require('../storage/s3-client');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

async function streamAudio(req, res) {
  const { bucket, key } = req.params;
  const range = req.headers.range;
  if (!range) {
    return res.status(416).send('Range header required');
  }
  const params = {
    Bucket: bucket,
    Key: key,
    Range: range,
  };
  try {
    const data = await s3.send(new GetObjectCommand(params));
    res.status(206);
    res.set({
      'Content-Range': data.ContentRange,
      'Accept-Ranges': 'bytes',
      'Content-Length': data.ContentLength,
      'Content-Type': data.ContentType,
    });
    data.Body.pipe(res);
  } catch (err) {
    res.status(404).json({ error: 'Audio not found' });
  }
}

module.exports = streamAudio; 