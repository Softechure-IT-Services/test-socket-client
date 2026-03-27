const fs = require("fs");
const path = "C:/Users/a/Desktop/test-socket/src/routes/channel.js";

let content = fs.readFileSync(path, "utf-8");

// Safe replacement ensuring we don't duplicate if already there
if (!content.includes("username: true,")) {
    content = content.replace(/avatar_url:\s*true,/g, "avatar_url: true,\n            username: true,");
    fs.writeFileSync(path, content, "utf-8");
    console.log("SUCCESS: Added username: true to Prisma selects.");
} else {
    console.log("username: true already exists in some places, skipping global replace or applying targeted.");
}
