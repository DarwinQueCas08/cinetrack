import React from 'react';

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 28 }: AvatarProps) {
  // Simple hash to generate a consistent color based on the name
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const colors = [
    { bg: '#FEE2E2', text: '#EF4444' }, // Red
    { bg: '#FEF3C7', text: '#F59E0B' }, // Amber
    { bg: '#D1FAE5', text: '#10B981' }, // Emerald
    { bg: '#E0E7FF', text: '#6366F1' }, // Indigo
    { bg: '#FCE7F3', text: '#EC4899' }, // Pink
    { bg: '#E0F2FE', text: '#0EA5E9' }, // Sky
    { bg: '#F3E8FF', text: '#A855F7' }, // Purple
  ];

  const hash = Math.abs(getHash(name));
  const colorIndex = hash % colors.length;
  const color = colors[colorIndex];

  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color.bg,
        color: color.text,
        fontSize: size * 0.45,
        fontWeight: 700,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
      title={name}
    >
      {initial}
    </div>
  );
}
