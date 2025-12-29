import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const fileUrl = body.path;

    if (!fileUrl) {
      return new Response(JSON.stringify({ success: false, message: "File path required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = path.join(process.cwd(), "public", fileUrl.replace(/^\/?/, ""));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ success: false, message: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error(err);
    // Always return valid JSON
    return new Response(JSON.stringify({ success: false, message: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
