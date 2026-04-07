import React from 'react';

/** Icons used by Deal Room pipeline UI (metrics + lead source badges). */
const DealRoomIconSvg: React.FC<{ name: string; color?: string; size?: number }> = ({ name, color = 'currentColor', size = 18 }) => {
    const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: color,
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        style: { display: 'block' as const },
    };

    switch (name) {
        case 'hot_leads':
            return (
                <svg {...common}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                    <circle cx="10" cy="7" r="4" />
                    <path d="M20 8v6" />
                    <path d="M23 11h-6" />
                </svg>
            );
        case 'deals_closed':
            return (
                <svg {...common}>
                    <path d="M12 1l7 7-7 7-7-7 7-7z" />
                    <path d="M5 18l-2 3h8l-2-3" />
                    <path d="M19 18l2 3h-8l2-3" />
                </svg>
            );
        case 'commission':
            return (
                <svg {...common}>
                    <path d="M12 1v22" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            );
        case 'top_source':
            return (
                <svg {...common}>
                    <path d="M3 3v18h18" />
                    <path d="M7 14l4-4 4 4 4-6" />
                </svg>
            );
        case 'source_whatsapp':
            return (
                <svg {...common}>
                    <path d="M20 12a8 8 0 0 1-11.8 7l-3.2 1 1-3.2A8 8 0 1 1 20 12z" />
                    <path d="M9.5 9.5c.3 2.2 2.3 4.1 4.5 4.5" />
                    <path d="M14.8 14.5l-1.3.7a1 1 0 0 1-1-.1 9.2 9.2 0 0 1-3.6-3.6 1 1 0 0 1-.1-1l.7-1.3" />
                    <path d="M14 18.3l1.3 1.2 2.6-2.4" />
                </svg>
            );
        case 'source_phone':
            return (
                <svg {...common}>
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6A19.7 19.7 0 0 1 2.2 4.3 2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 3a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 5.9 5.9l1.2-1.3a2 2 0 0 1 2.1-.5c1 .4 2 .6 3 .7A2 2 0 0 1 22 16.9z" />
                </svg>
            );
        case 'source_instagram':
            return (
                <svg {...common}>
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" />
                </svg>
            );
        case 'source_content':
            return (
                <svg {...common}>
                    <rect x="3" y="4" width="18" height="15" rx="2" />
                    <path d="M8 10l3 3 5-5" />
                    <path d="M8 19v2h8v-2" />
                </svg>
            );
        case 'source_referral':
            return (
                <svg {...common}>
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 20c.7-2.7 2.8-4 6-4 2.2 0 3.9.6 5 2" />
                    <path d="M15 8h6" />
                    <path d="M18 5l3 3-3 3" />
                </svg>
            );
        case 'source_default':
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                </svg>
            );
        default:
            return <span style={{ fontWeight: 900, color }}>{name}</span>;
    }
};

export default DealRoomIconSvg;
