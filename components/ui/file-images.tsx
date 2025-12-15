import Image from "next/image";

export default function ImageItem({ src = "", alt = "" }) {
  return (
    <Image
  src={src}
  alt={alt}
  width={177}
  height={150}
  className="rounded-md h-40"
  unoptimized
/>

  );
}
