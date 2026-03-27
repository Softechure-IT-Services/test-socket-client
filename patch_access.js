const fs = require("fs");
const path = "C:/Users/a/Desktop/test-socket/src/routes/channel.js";

const content = fs.readFileSync(path, "utf-8");

// Using a very specific anchor string instead of complex regex
const target = '      if (!isMember) {\n' +
'        if (channel.is_dm) {\n' +
'          return res.status(403).json({ error: "Not a member" });\n' +
'        }\n' +
'        return res.json({\n' +
'          channel,\n' +
'          members: [],\n' +
'          is_member: false,\n' +
'        });\n' +
'      }';

const replacement = '      if (!isMember) {\n' +
'        return res.status(403).json({ error: "You are not a member of this private channel" });\n' +
'      }';

if (content.indexOf(target) !== -1) {
    const newContent = content.replace(target, replacement);
    fs.writeFileSync(path, newContent, "utf-8");
    console.log("Security patch applied successfully via exact string match.");
} else {
    // Try with LF only for line endings
    const targetLF = target.replace(/\\r\\n/g, "\\n");
    if (content.indexOf(targetLF) !== -1) {
        const newContent = content.replace(targetLF, replacement);
        fs.writeFileSync(path, newContent, "utf-8");
        console.log("Security patch applied successfully via LF match.");
    } else {
        console.error("COULD NOT FIND THE TARGET BLOCK IN CHANNEL.JS");
        // Fallback to a partial match to be sure
        const partial = 'return res.json({\\n\' +\n\'          channel,\\n\' +\n\'          members: [],\\n\' +\n\'          is_member: false,\\n\' +\n\'        });';
        console.log("Check if the block exists manually.");
        process.exit(1);
    }
}
