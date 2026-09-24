export const travelStyles = ['adventure', 'discovery', 'family', 'romance', 'unwind', 'luxury'] as const;
export type TravelStyle = (typeof travelStyles)[number];
