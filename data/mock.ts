import type { Listing, Rental } from '../types';

export const listings: Listing[] = [
  {
    id: 'sony-a7iii',
    ownerId: 'owner-aiman',
    title: 'Sony A7 III Mirrorless Camera',
    category: 'Cameras',
    dailyPrice: 45,
    estimatedValue: 4800,
    location: 'Petaling Jaya',
    rating: 4.9,
    verifiedOwner: true,
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
    description: 'Full-frame mirrorless camera with battery, charger and camera strap included.',
    status: 'published'
  },
  {
    id: 'ps5-console',
    ownerId: 'owner-sarah',
    title: 'PlayStation 5 Console',
    category: 'Gaming',
    dailyPrice: 38,
    estimatedValue: 2300,
    location: 'Subang Jaya',
    rating: 5.0,
    verifiedOwner: true,
    imageUrl: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80',
    description: 'PS5 console with one controller and HDMI cable. Suitable for weekend rentals.',
    status: 'published'
  },
  {
    id: 'portable-projector',
    ownerId: 'owner-daniel',
    title: 'Portable Full HD Projector',
    category: 'Electronics',
    dailyPrice: 30,
    estimatedValue: 1200,
    location: 'Kuala Lumpur',
    rating: 4.8,
    verifiedOwner: true,
    imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
    description: 'Portable projector for presentations, movies and small events.',
    status: 'published'
  }
];

export const rentals: Rental[] = [
  {
    id: 'rental-1001',
    listingId: 'sony-a7iii',
    listingTitle: 'Sony A7 III Mirrorless Camera',
    startDate: '2026-10-12',
    endDate: '2026-10-14',
    status: 'active',
    amount: 94.5
  },
  {
    id: 'rental-1002',
    listingId: 'ps5-console',
    listingTitle: 'PlayStation 5 Console',
    startDate: '2026-10-25',
    endDate: '2026-10-27',
    status: 'upcoming',
    amount: 79.8
  }
];
