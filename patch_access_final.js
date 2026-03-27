const fs = require("fs");
const path = "C:/Users/a/Desktop/test-socket/src/routes/channel.js";

const content = fs.readFileSync(path, "utf-8");

// Extremely simple and flexible regex to find that specific block
const regex = /if\s*\(channel\.is_private\)\s*\{[\s\S]*?isMember[\s\S]*?if\s*\(\!isMember\)\s*\{[\s\S]*?is_member:\s*false[\s\S]*?\}\s*\}\s*\}/;

const replacement = 'if (channel.is_private) {\n' +
'      const isMember = await prisma.channel_members.findUnique({\n' +
'        where: {\n' +
'          channel_id_user_id: {\n' +
'            channel_id: channelId,\n' +
'            user_id: userId,\n' +
'          },\n' +
'        },\n' +
'      });\n' +
'\n' +
'      if (!isMember) {\n' +
'        return res.status(403).json({ error: "You are not a member of this private channel" });\n' +
'      }\n' +
'    }';

if (regex.test(content)) {
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync(path, newContent, "utf-8");
    console.log("Security patch applied successfully via flexible regex.");
} else {
    console.error("COULD NOT FIND THE TARGET BLOCK WITH FLEXIBLE REGEX.");
    process.exit(1);
}
