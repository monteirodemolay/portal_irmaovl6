export interface ConstellationMemoryMedia {
  id: string;
  url: string;
  caption: string | null;
  altText: string | null;
}

export interface ConstellationMemory {
  id: string;
  eventId: string;
  title: string;
  archiveTitle: string | null;
  description: string | null;
  href: string;
  year: number;
  dateIso: string;
  dateLabel: string;
  location: string | null;
  boardTermId: string | null;
  boardTermName: string | null;
  kindLabels: string[];
  media: ConstellationMemoryMedia[];
  fallbackImageUrl: string | null;
  peopleCount: number;
  itemCount: number;
  mediaCount: number;
  photoCount: number;
}

export interface MemoryConstellationStats {
  totalMemories: number;
  totalPhotos: number;
  totalYears: number;
}

export interface MemoryConstellationBundle {
  memories: ConstellationMemory[];
  years: number[];
  stats: MemoryConstellationStats;
}
