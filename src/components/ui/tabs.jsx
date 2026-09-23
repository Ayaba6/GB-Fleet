import React, { useState } from "react";

export default function Tabs({ tabs = [], defaultValue }) {
  const [activeTab, setActiveTab] = useState(defaultValue || (tabs[0]?.value || null));

  if (!Array.isArray(tabs) || tabs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200">
        {(tabs || []).map((tab, idx) =>
          tab ? (
            <button
              key={tab.value || idx}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 -mb-px font-medium text-sm rounded-t-md ${
                activeTab === tab.value
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label || ""}
            </button>
          ) : null
        )}
      </div>

      <div className="p-4 bg-white rounded-b-md shadow border">
        {(tabs || []).map((tab, idx) =>
          tab && tab.value === activeTab ? <div key={tab.value || idx}>{tab.content || null}</div> : null
        )}
      </div>
    </div>
  );
}
