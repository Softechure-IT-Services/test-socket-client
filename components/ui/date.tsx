type DateSeparatorProps = {
  date: any;
};

export default function DateSeparator({ date }: DateSeparatorProps) {
  const messageDate = new Date(date);
  const today = new Date();
  
  // Reset hours/minutes/seconds for accurate comparison
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const messageDay = new Date(messageDate);
  messageDay.setHours(0, 0, 0, 0);

  let formattedDate = "";

  if (messageDay.getTime() === today.getTime()) {
    formattedDate = "Today";
  } else if (messageDay.getTime() === yesterday.getTime()) {
    formattedDate = "Yesterday";
  } else {
    formattedDate = messageDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="flex items-center justify-center absolute left-[50%] top-0 -translate-x-[50%] -translate-y-[50%]">
      <span className="px-4 py-1 text-xs text-gray-600 bg-white border rounded-full">
        {formattedDate}
      </span>
    </div>  
  );

}



