import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function SiteHeader({
  cta = "进入创作",
  ctaTo = "/player",
}: {
  cta?: string;
  ctaTo?: string;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 md:px-10">
      <Link
        to="/"
        className="text-sm font-light tracking-[0.35em] text-white/90 uppercase"
      >
        Rhythm Vision
      </Link>
      <Link to={ctaTo}>
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 text-white/90 backdrop-blur hover:bg-white/10 hover:text-white"
        >
          {cta}
        </Button>
      </Link>
    </header>
  );
}
