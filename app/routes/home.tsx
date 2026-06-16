import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rhythm Vision" },
    { name: "description", content: "音频可视化创作工具" },
  ];
}

const features = [
  {
    title: "朦胧梦幻视觉",
    description: "落雨、落花、极光光晕——柔光与雾气随音乐呼吸律动。",
  },
  {
    title: "实时歌词识别",
    description: "浏览器本地 Whisper 识别，播放时自动浮现歌词，无需手动排版。",
  },
  {
    title: "录制导出",
    description: "将画面与音频合成为 WebM 视频，一键保存你的创作。",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto flex max-w-4xl flex-col gap-12 px-4 py-16">
        <header className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Rhythm Vision</h1>
          <p className="text-lg text-muted-foreground">
            在浏览器里把音乐变成画面——2D/3D 音频可视化、动态歌词、录制导出。
          </p>
          <Link to="/player">
            <Button size="lg">开始创作</Button>
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>

        <footer className="text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">
            产品文档见 <code>doc/product-vision.md</code>
          </Link>
        </footer>
      </div>
    </main>
  );
}
