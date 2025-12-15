"use client"

export default function Titletab({ title }: { title: string }) {
  return (
    <p className="text-sm font-medium text-foreground">
      {title}
    </p>
  )
}