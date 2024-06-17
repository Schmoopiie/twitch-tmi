var crypto = require("crypto");
var fs = require("fs");

function checksum(input) {
	var hash = crypto.createHash("sha384").update(input, "utf8");
	var hashBase64 = hash.digest("base64");
	return `sha384-${hashBase64}`;
}

fs.readFile(process.argv[2], (err, data) => {
	if(err) {
		throw err;
	}
	console.log(`SRI Hash generated for ${process.argv[2]}: ${checksum(data)}`);
});
