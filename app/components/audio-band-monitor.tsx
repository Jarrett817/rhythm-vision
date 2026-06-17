import { BAND_VISUAL_ROLES, type AudioFeatures } from "~/lib/audio/types";
import { Music2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";

const bands = [
  { key: "bass" as const, label: "低频", color: "bg-orange-400" },
  { key: "mid" as const, label: "中频", color: "bg-violet-400" },
  { key: "treble" as const, label: "高频", color: "bg-cyan-400" },
  { key: "rms" as const, label: "响度", color: "bg-emerald-400" },
];

export function AudioBandMonitor({ features }: { features: AudioFeatures }) {
  return (
    <Card size="sm" className="bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">实时频段</CardTitle>
        <CardDescription className="text-xs">
          低 / 中 / 高 / 响度驱动画面变化
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {bands.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[10px] text-muted-foreground">
              {label}
            </span>
            <Progress value={Math.min(100, features[key] * 100)} className="h-1.5" />
          </div>
        ))}
        {features.beat && (
          <Badge variant="outline" className="animate-pulse gap-1 text-[10px]">
            <Music2 className="size-3" />
            节拍
          </Badge>
        )}
        <dl className="space-y-1 pt-1 text-[10px] text-muted-foreground">
          {Object.entries(BAND_VISUAL_ROLES).map(([k, v]) => (
            <div key={k} className="flex gap-1">
              <dt className="shrink-0 opacity-60">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
