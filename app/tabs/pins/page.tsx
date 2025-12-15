  "use client";
import Link from "next/link";
import MainHeader from "@/app/shared/ui/MainHeader";
export default function PinnedMessages() {
  const msgs = [
    {
      name: "shravan choudhary",
      date: "Nov 26th at 10:15 AM",
      lines: [
        "chris@mdmd.io",
        "738bAI#^%A#"
      ]
    },
    {
      name: "shravan choudhary",
      date: "Nov 1st at 12:13 PM",
      lines: [
        "cyberpanel",
        "metrobuddy",
        "https://82.112.235.68:8090/",
        "admin",
        "y1E+Y1oSaV?tRrw:nmFF"
      ]
    },
    {
      name: "shravan choudhary",
      date: "Jul 11th at 11:57 AM",
      lines: [
        "Template-%7C-IMSU?node-id=0-967&t=IMRY6ai9pxRXML3I-0 https://www.figma.com/design/qV5TcuWLpWjWBdpUhcQSdN/Branded-PDF-Estimate-"
      ]
    },
    {
      name: "shravan choudhary",
      date: "Jun 16th at 6:31 PM",
      lines: [
        "https://reporting.softechure.com/",
        "ayush.softechure@gmail.com",
        "Ayu@2k25"
      ]
    }
  ];

  return (
    <>
    <MainHeader />
    <div className="max-w-5xl mx-auto  space-y-6 p-4">
      {msgs.map((msg, i) => (
        <div key={i} className="border rounded-xl text-gray-500 p-4 shadow-sm bg-white">
          {/* Header */}
          <div className="flex items-top gap-2">
            <div className=" p-4 h-10  rounded-md bg-green-600 text-white flex items-center justify-center font-semibold">
              {msg.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-black capitalize">{msg.name}</p>
              <p className="text-gray-500 text-sm">{msg.date}</p>
              <p className="mt-2">{msg.lines}</p>
            </div>
          </div>

        </div>
      ))}
    </div>
      </>
  );
}
