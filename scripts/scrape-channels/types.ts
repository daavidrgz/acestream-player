export interface ScrapedChannel {
  category: string;
  name: string;
  id: string;
  resolution: 'FHD' | 'HD';
  recommended?: boolean;
}
