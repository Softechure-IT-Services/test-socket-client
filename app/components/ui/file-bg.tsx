"use client"
import Image from "next/image"

export default function FilesBg(){
    return <>
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded ">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Drop to attach in chat</p>
        </div>
    </>
}