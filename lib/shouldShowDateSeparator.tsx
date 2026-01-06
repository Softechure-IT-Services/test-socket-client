// Helper function
export function shouldShowDateSeparator(messages: any[], index: number) {
  if (index === 0) return true;

  const currentDate = new Date(messages[index].created_at).toDateString();
  const previousDate = new Date(messages[index - 1].created_at).toDateString();

  return currentDate !== previousDate;
}
