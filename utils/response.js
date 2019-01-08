const stream = require("stream");
const zlib = require("zlib");
const promisify = require("util").promisify;

// Creates a new APIResponse object.
// data can be a Readable stream, Buffer, string, or object (which will be JSON-serialized).
// options.contentType: Content-Type of the response. Default is determined by the type of data.
// options.statusCode: HTTP status code. Default is 200.
// options.encoding: 'gzip' or 'identity' (default), the encoding already applied to 'data'
// options.headers: object with additional header names as keys and header values as values
// As a shorthand, options can be specified only as an integer status code.
function APIResponse(data, options) {
  options = options || {};
  if (Number.isInteger(options)) {
    options = { statusCode: options };
  }

  if (data instanceof APIResponse) {
    this.data = data.data;
    this.options = data.options;
    return;
  }

  if (data instanceof stream.Readable) {
    options.contentType = options.contentType || "application/octet-stream";
  } else if (data instanceof Buffer) {
    options.contentType = options.contentType || "application/octet-stream";
  } else if (!data) {
    data = '';
    options.statusCode = options.statusCode || 404;
  } else if (typeof data === "string") {
    options.contentType = options.contentType || "text/plain";
  } else if (typeof data === "object") {
    options.contentType = options.contentType || "application/json";
    data = JSON.stringify(data);
  } else {
    throw new Error("Unknown data type for: " + data);
  }

  options.statusCode = options.statusCode || 200;
  options.encoding = options.encoding || 'identity';
  options.headers = options.headers || {};

  if (options.encoding !== 'identity' && options.encoding !== 'gzip') {
    throw new Error("Unknown encoding: " + options.encoding);
  }

  this.data = data;
  this.options = options;
}

// Responds to 'res'. Sets headers and compresses the response for supported clients
APIResponse.prototype.respond = async function (req, res) {
  const headers = this.options.headers;
  if (!headers["Content-Type"] && this.options.contentType) {
    headers["Content-Type"] = this.options.contentType;
  }

  let encodings;
  if (req.headers["accept-encoding"]) {
    encodings = req.headers["accept-encoding"].split(",").map(e => e.trim());
  } else {
    encodings = [];
  }
  const acceptsGzip = encodings.indexOf("gzip") !== -1;

  let isGzipped = this.options.encoding === 'gzip';

  if (isGzipped && !acceptsGzip) {
    // Decompress precompressed responses if the client doesn't support them
    if (this.data instanceof stream.Readable) {
      const gunzipper = zlib.createGunzip();
      this.data.pipe(gunzipper);
      this.data = gunzipper;
    } else {
      this.data = await promisify(zlib.gunzip)(this.data);
    }

    isGzipped = false;
  } else if (acceptsGzip && !isGzipped) {
    if (this.data instanceof stream.Readable) {
      const gzipper = zlib.createGzip();
      this.data.pipe(gzipper);
      this.data = gzipper;
    } else {
      this.data = await promisify(zlib.gzip)(this.data);
    }

    isGzipped = true;
  }

  if (isGzipped) {
    headers["Content-Encoding"] = 'gzip';
  }

  if (!(this.data instanceof stream.Readable)) {
    headers["Content-Length"] = Buffer.byteLength(this.data);
  }

  res.writeHead(this.options.statusCode, headers);

  if (this.data instanceof stream.Readable) {
    this.data.pipe(res);
  } else {
    res.end(this.data);
  }
};

module.exports.APIResponse = APIResponse;
