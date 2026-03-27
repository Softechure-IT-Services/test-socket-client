const fs = require("fs");
const path = "C:/Users/a/Desktop/test-socket/src/routes/channel.js";

let content = fs.readFileSync(path, "utf-8");

// Fix 1: Add import if missing
if (!content.includes('import { getPreviewText }')) {
  content = content.replace(
    'import {',
    'import { getPreviewText } from "../utils/format.js";\nimport {'
  );
}

// Fix 2: thread_parent_id: null
if (!content.includes('thread_parent_id: null')) {
  content = content.replace(
    'channel_id: channelId,\r\n        ...(cursor',
    'channel_id: channelId,\r\n        thread_parent_id: null,\r\n        ...(cursor'
  );
  if (!content.includes('thread_parent_id: null')) {
    content = content.replace(
      'channel_id: channelId,\n        ...(cursor',
      'channel_id: channelId,\n        thread_parent_id: null,\n        ...(cursor'
    );
  }
}

// Fix 3: newMessageNotification
const forwardBlockTarget1 = \`      io.to(\\\`channel_\\\${targetChannelId}\\\`).emit("receiveMessage", payload);\\r\\n\\r\\n      res.json({ success: true, message: payload });\`;
const forwardBlockTarget2 = \`      io.to(\\\`channel_\\\${targetChannelId}\\\`).emit("receiveMessage", payload);\\n\\n      res.json({ success: true, message: payload });\`;

const forwardReplacement = \`      io.to(\\\`channel_\\\${targetChannelId}\\\`).emit("receiveMessage", payload);

      try {
        const channelInfo = await prisma.channels.findUnique({ where: { id: targetChannelId }, select: { name: true, is_dm: true }});
        const members = await prisma.channel_members.findMany({ where: { channel_id: targetChannelId }, select: { user_id: true }});
        
        let rawContent = newMessage.content;
        if (newMessage.is_forwarded) rawContent = "Forwarded a message";
        const previewText = getPreviewText(rawContent, payload.files);

        members.forEach((m) => {
          if (String(m.user_id) === String(userId)) return;

          io.to(\\\`user_\\\${m.user_id}\\\`).emit("newMessageNotification", {
            channel_id: targetChannelId,
            message_id: newMessage.id,
            sender_id: userId,
            sender_name: payload.sender_name,
            avatar_url: payload.avatar_url,
            preview: previewText,
            channel_name: channelInfo?.name,
            is_dm: channelInfo?.is_dm === true,
            created_at: new Date().toISOString()
          });
        });
      } catch (err) {
        console.error("Failed to emit newMessageNotification for forward:", err.message);
      }

      res.json({ success: true, message: payload });\`;

if (!content.includes('Failed to emit newMessageNotification for forward:')) {
  if (content.includes(forwardBlockTarget1)) {
     content = content.replace(forwardBlockTarget1, forwardReplacement);
  } else if (content.includes(forwardBlockTarget2)) {
     content = content.replace(forwardBlockTarget2, forwardReplacement);
  } else {
     console.error("COULD NOT PATCH FORWARD NOTIFICATION!");
  }
}

fs.writeFileSync(path, content, "utf-8");
console.log("Restore Patcher finished.");
