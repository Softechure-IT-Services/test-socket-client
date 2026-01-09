import MessageInput from "@/app/components/custom/MessageInput";

const threads = [
  {
    title: "uday shekhawat",
    participants: "uday shekhawat and you",
    messages: [
      {
        name: "Ayush kumar",
        date: "Sep 22nd at 4:28 PM",
        lines: ["15 min me ho jayega sir"],
      },
      {
        name: "Uday shekhawat",
        date: "Sep 22nd at 5:16 PM",
        lines: ["??"],
      },
    ],
  },
    {
    title: "Sagar johari",
    participants: "Sagar johari and you",
    messages: [
      {
        name: "Shravan choudhary",
        date: "Jul 31st at 12:09 PM",
        lines: [
          'put "The" infront of this field and also can you clean and replace . with space',
          ,
        ],
      },
       {
        name: "Ayush kumar",
        date: "Sep 22nd at 4:28 PM",
        lines: ["15 min me ho jayega sir"],
      }
    ],
  },
  {
    title: "shravan choudhary",
    participants: "shravan choudhary and you",
    messages: [
      {
        name: "Shravan choudhary",
        date: "Jul 31st at 12:09 PM",
        lines: [
          'put "The" infront of this field and also can you clean and replace . with space',
          "output ex.: Austin.28B.IMSU = The Austin 28B IMSU",
        ],
      },
       {
        name: "Ayush kumar",
        date: "Sep 22nd at 4:28 PM",
        lines: ["15 min me ho jayega sir"],
      }
    ],
  },
];


export default function Threads() {
  return (
    <div className="py-10 px-4 space-y-10 bg-gray-100">
      <h2 className="text-xl border-b pb-4 font-semibold">Threads</h2>

      {threads.map((thread, tIndex) => (
        <div key={tIndex}>
          {/* Thread Header */}
          <div className=" mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <h4 className="font-semibold">{thread.title}</h4>
            </div>
            <p className="text-sm text-gray-500">
              {thread.participants}
            </p>
          </div>

          {/* Thread Card */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            {thread.messages.map((msg, i) => (
              <div key={i} className="flex gap-1">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-lg bg-green-600 text-white flex items-center justify-center font-semibold uppercase">
                  {msg.name[0]}
                </div>

                {/* Message */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{msg.name}</p>
                    <p className="text-xs text-gray-400">
                      {msg.date}
                    </p>
                  </div>

                  <div className="mt-1 space-y-1">
                    {msg.lines.map((line, idx) => (
                      <p
                        key={idx}
                        className="text-sm text-gray-800 break-all"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Reply Box */}
            <div className="border rounded-lg p-3 text-sm text-gray-400">
              Reply…
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

