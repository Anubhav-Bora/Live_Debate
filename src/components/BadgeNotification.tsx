"use client";
import { useEffect } from "react";

interface Badge {
  icon?: string;
  name: string;
  description: string;
}

export default function BadgeNotification({
  badge,
  onClose,
}: {
  badge: Badge;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 w-64 border-l-4 border-yellow-400">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-2xl">{badge.icon || "🏆"}</div>
          <div className="ml-3">
            <h3 className="font-bold text-gray-900">New Badge Unlocked!</h3>
            <p className="mt-1 text-sm text-gray-700">
              <span className="font-semibold">{badge.name}</span>: {badge.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-500"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}