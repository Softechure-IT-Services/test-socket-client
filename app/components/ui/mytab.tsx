"use client"



import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs"
import { useState } from "react"

import { FiMessageCircle } from "react-icons/fi"
import { FaRegFileAlt } from "react-icons/fa"
import { PiPushPinSimpleThin } from "react-icons/pi"

export default function MyTabs() {
  const [activeTab, setActiveTab] = useState("tab1")

  const tabs = [
    {
      value: "tab1",
      label: "Messages",
      icon: <FiMessageCircle className="mr-1" />,
      content: "Content for Tab One",
    },
   
    
  ]
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.icon}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>  
      ))}

    </Tabs>
  )
}
