const fs = require("fs");
const path = "C:/Users/a/Desktop/test-socket/src/routes/channel.js";

let content = fs.readFileSync(path, "utf-8");

const target = \`      if (!isMember) {
        if (channel.is_dm) {
          return res.status(403).json({ error: "Not a member" });
        }
        return res.json({
          channel,
          members: [],
          is_member: false,
        });
      }\`;

const replacement = \`      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this private channel" });
      }\`;

if (content.indexOf(target) !== -1) {
    content = content.replace(target, replacement);
} else {
    // Try with different line endings
    const targetLF = target.replace(/\\r\\n/g, "\\n");
    if (content.indexOf(targetLF) !== -1) {
        content = content.replace(targetLF, replacement);
    } else {
        console.error("Could not find Target Block for 403 patch");
        process.exit(1);
    }
}

fs.writeFileSync(path, content, "utf-8");
console.log("Security Patch applied successfully.");
