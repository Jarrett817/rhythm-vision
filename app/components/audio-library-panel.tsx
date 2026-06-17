import { useEffect, useRef, useState } from "react";
import type { CarouselApi } from "~/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Progress } from "~/components/ui/progress";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import {
  formatAudioTime,
  type useAudioEngine,
} from "~/features/audio/use-audio-engine";
import type { StoredTrack } from "~/lib/storage/audio-store";
import {
  Music2,
  Pause,
  Play,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "~/lib/utils";

type AudioEngineState = ReturnType<typeof useAudioEngine>;

interface AudioLibraryPanelProps {
  engine: AudioEngineState;
}

function TrackSlide({
  track,
  active,
  playing,
  onSelect,
  onRemove,
}: {
  track: StoredTrack;
  active: boolean;
  playing: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const ext = track.fileName.split(".").pop()?.toUpperCase() ?? "AUDIO";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border transition-all",
        active
          ? "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-md"
          : "border-border/60 bg-card/80 hover:border-border",
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-2xl" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Music2 className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm">{track.fileName}</CardTitle>
              <CardDescription className="text-[11px]">
                {new Date(track.savedAt).toLocaleDateString("zh-CN")}
              </CardDescription>
            </div>
          </div>
          <Badge variant={active ? "default" : "secondary"} className="shrink-0">
            {ext}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1.5">
          {active && playing && (
            <Badge variant="outline" className="text-[10px]">
              播放中
            </Badge>
          )}
          {active && !playing && (
            <Badge variant="outline" className="text-[10px]">
              已选中
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t bg-muted/30 pt-3">
        <Button
          size="sm"
          className="flex-1"
          variant={active ? "default" : "secondary"}
          onClick={onSelect}
        >
          {active ? "当前曲目" : "切换播放"}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`删除 ${track.fileName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AudioLibraryPanel({ engine }: AudioLibraryPanelProps) {
  const {
    library,
    currentTrackId,
    currentTrack,
    playing,
    loaded,
    restoring,
    currentTime,
    duration,
    addFiles,
    selectTrack,
    removeTrack,
    togglePlay,
    seek,
  } = engine;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (!carouselApi || !currentTrackId) return;
    const index = library.findIndex((t) => t.id === currentTrackId);
    if (index >= 0) carouselApi.scrollTo(index);
  }, [carouselApi, currentTrackId, library]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      const index = carouselApi.selectedScrollSnap();
      const track = library[index];
      if (track && track.id !== currentTrackId) {
        void selectTrack(track.id);
      }
    };
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, library, currentTrackId, selectTrack]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    void addFiles(files);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">音乐库</Label>
        <Badge variant="secondary">{library.length} 首</Badge>
      </div>

      {restoring && (
        <Alert>
          <AlertDescription>正在从本地恢复音乐库…</AlertDescription>
        </Alert>
      )}

      <div className="relative px-8">
        <Carousel
          setApi={setCarouselApi}
          opts={{ align: "center", loop: false }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {library.map((track) => (
              <CarouselItem key={track.id} className="basis-[88%] pl-2 sm:basis-[75%]">
                <TrackSlide
                  track={track}
                  active={track.id === currentTrackId}
                  playing={playing && track.id === currentTrackId}
                  onSelect={() => void selectTrack(track.id)}
                  onRemove={() => void removeTrack(track.id)}
                />
              </CarouselItem>
            ))}
            <CarouselItem className="basis-[88%] pl-2 sm:basis-[75%]">
              <Card className="flex h-full min-h-[168px] flex-col items-center justify-center border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Plus className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">添加歌曲</CardTitle>
                    <CardDescription className="text-xs">
                      支持多选，保存在本地
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4" />
                    选择音频
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
          {library.length > 0 && (
            <>
              <CarouselPrevious className="left-0 size-8" />
              <CarouselNext className="right-0 size-8" />
            </>
          )}
        </Carousel>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      <Separator />

      {/* 播放控制 */}
      <Card size="sm" className="bg-muted/20">
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="default"
              className="shrink-0 rounded-full"
              disabled={!loaded}
              onClick={() => void togglePlay()}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {currentTrack?.fileName ?? "尚未选择歌曲"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-4" />
              新增
            </Button>
          </div>

          <div className="space-y-1.5">
            <Progress value={progress} className="h-1.5" />
            <Slider
              min={0}
              max={duration || 100}
              step={0.1}
              value={[currentTime]}
              disabled={!loaded || duration <= 0}
              onValueChange={(v) => {
                const t = Array.isArray(v) ? v[0] : v;
                seek(t ?? 0);
              }}
              className="py-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
