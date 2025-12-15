import Image from "next/image";

export default function Images({ src = "", alt = "" }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={500}
      height={300}
    />
  );
}
