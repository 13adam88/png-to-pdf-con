
export enum AppStatus {
  IDLE,
  FILES_SELECTED,
  CONVERTING,
  SUCCESS,
}

export interface ConversionOptions {
  pageSize: 'a4' | 'letter' | 'a3' | 'a5';
  orientation: 'portrait' | 'landscape';
  imageFit: 'fit' | 'original' | 'fill';
}
