const fs = require("fs");
const path = "C:/Users/a/Desktop/test-socket/src/routes/channel.js";
const content = fs.readFileSync(path, "utf-8");
const lines = content.split(/\r?\n/);

// Lines 778 to 787 (1-indexed) are indices 777 to 786 (0-indexed)
// We use line-based splice to avoid regex/matching issues with large files
const start = 777;
const end = 786;

console.log("Checking line 778 (index 777):", lines[start]);
console.log("Checking line 787 (index 786):", lines[end]);

if (lines[start] && lines[start].includes("if (!isMember) {") && lines[end] && lines[end].trim() === "}") {
    const newReplacement = [
        "      if (!isMember) {",
        '        return res.status(403).json({ error: "You are not a member of this private channel" });',
        "      }"
    ];
    lines.splice(start, (end - start + 1), ...newReplacement);
    
    // Maintain original line endings if possible, but joining with \n is generally safe for node
    const finalBuffer = lines.join("\r\n"); 
    fs.writeFileSync(path, finalBuffer, "utf-8");
    console.log("SUCCESS: Replaced lines 778-787 surgically.");
} else {
    console.error("FAILURE: Target lines did not match expected structure.");
    process.exit(1);
}
