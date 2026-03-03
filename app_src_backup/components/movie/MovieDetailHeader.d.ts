import type { MovieDetail } from '@/types/movie';
export interface MovieDetailHeaderProps {
    movie: MovieDetail;
    onMonitoredChange: (monitored: boolean) => void;
    onPreviousMovie?: () => void;
    onNextMovie?: () => void;
}
export declare function MovieDetailHeader({ movie, onMonitoredChange, onPreviousMovie, onNextMovie }: MovieDetailHeaderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MovieDetailHeader.d.ts.map