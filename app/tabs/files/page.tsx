"use client";
import ButtonGroup from "@/app/components/ui/button-group";
import { useState } from "react";
import DocumentItem from "@/app/components/ui/documentItem";
import ImageItem from "@/app/components/ui/file-images";
import MainHeader from "@/app/shared/ui/MainHeader";
export default function FileTab() {
  const [showAll, setShowAll] = useState(false);

  const images = [
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png",
    "/images/home-chair.png"

  ];

  const documents = [
    { name: "sits (1).zip", sharedBy: "uday shekhawat", date: "Nov 12th" },
    { name: "DynamicApiController.php", sharedBy: "uday shekhawat", date: "Nov 11th" },
    { name: "app.blade.php", sharedBy: "ayush kumar", date: "Nov 6th" },
    { name: "custom-design.blade.php", sharedBy: "ayush kumar", date: "Nov 6th" },
    { name: "Solestone Admin Panel Product Format.xlsx", sharedBy: "ayush kumar", date: "Nov 6th" },
  ];

  const visibleImages = showAll ? images : images.slice(0, 5);

  return (
    <>
    <MainHeader />
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
        
      
      


  
      {/* Search */}
      <div className="w-full">
        <input 
          type="text"
          placeholder="Search files"
          className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring focus:ring-blue-200"
        />
      </div>

      {/* Header with See All */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg text-gray-500 font-semibold">Photos and videos</h2>

        <button 
          className="text-blue-600 text-sm font-medium hover:underline"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show less" : "See all"}
        </button>
      </div>

      {/* Images */}
      <div className="grid grid-cols-5 gap-3 rounded-md"> 
        {visibleImages.map((src, idx) => (
          <ImageItem key={idx} src={src} />
        ))}
      </div>

      {/* Documents */}
      <h2 className="text-lg text-gray-500 font-semibold">Documents</h2>

      <div className="rounded-md border border-gray-300">
        {documents.map((doc, idx) => (
          <DocumentItem 
            key={idx}
            name={doc.name}
            sharedBy={doc.sharedBy}
            date={doc.date}
          />
        ))}
      </div>
      
    </div>
    </>
  );
}
    