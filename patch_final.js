const fs = require("fs");
const path = "C:/Users/a/Desktop/test-socket/src/routes/channel.js";

let content = fs.readFileSync(path, "utf-8");

// 1. Add getPreviewText import
if (!content.includes('import { getPreviewText }')) {
  // Safe insert after import fs
  content = content.replace('import fs from "fs";', 'import fs from "fs";\nimport { getPreviewText } from "../utils/format.js";');
}

// 2. Add thread_parent_id: null
const msgWhereTarget = "      where: {\r\n        channel_id: channelId,\r\n        ...(cursor && { id: { lt: cursor } }),";
const msgWhereReplacement = "      where: {\r\n        channel_id: channelId,\r\n        thread_parent_id: null,\r\n        ...(cursor && { id: { lt: cursor } }),";

const msgWhereTargetLF = "      where: {\n        channel_id: channelId,\n        ...(cursor && { id: { lt: cursor } }),";
const msgWhereReplacementLF = "      where: {\n        channel_id: channelId,\n        thread_parent_id: null,\n        ...(cursor && { id: { lt: cursor } }),";

if (!content.includes('thread_parent_id: null')) {
  if (content.includes(msgWhereTarget)) {
    content = content.replace(msgWhereTarget, msgWhereReplacement);
  } else if (content.includes(msgWhereTargetLF)) {
    content = content.replace(msgWhereTargetLF, msgWhereReplacementLF);
  }
}

// 3. Add forward notification
const forwardTargetPos = content.indexOf('io.to(`channel_${targetChannelId}`).emit("receiveMessage", payload);');
if (forwardTargetPos > -1 && !content.includes('newMessageNotification", {')) {
  
  const injectBlock = `      try {
        const channelInfo = await prisma.channels.findUnique({ where: { id: targetChannelId }, select: { name: true, is_dm: true }});
        const members = await prisma.channel_members.findMany({ where: { channel_id: targetChannelId }, select: { user_id: true }});
        let rawContent = newMessage.content;
        if (newMessage.is_forwarded) rawContent = "Forwarded a message";
        const previewText = getPreviewText(rawContent, payload.files);
        members.forEach((m) => {
          if (String(m.user_id) === String(userId)) return;
          io.to(\`user_\${m.user_id}\`).emit("newMessageNotification", {
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
      } catch (err) { }
`;
  
  // Find where res.json is located after the target
  const resJsonPos = content.indexOf('res.json({ success: true, message: payload });', forwardTargetPos);
  if (resJsonPos > -1) {
    // Slice and insert
    const before = content.slice(0, resJsonPos);
    const after = content.slice(resJsonPos);
    content = before + injectBlock + after;
  }
}

fs.writeFileSync(path, content, "utf-8");
console.log("SUCCESS: Patched channel.js safely.");
