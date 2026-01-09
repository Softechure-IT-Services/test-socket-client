"use client"
import Image from "next/image"

export default function FilesBg(){
    return <>
    <div className="bg-white flex flex-col justify-center opacity-75 items-center w-screen z-999 h-full">
        <Image src="/images/file-img.png" width={80} height={80}  alt=""/>
        <h2 className="mt-5 font-semibold text-4xl">Upload to SOFTECHURE IT SERVICES</h2>
        <p className="mt-3">Hold <span className="px-2 py-1 bg-gray-100 rounded-sm shadow-md">shift</span> to share immediately</p>
    </div>
    </>
}