import Link from "next/link";
import { ArrowRight, Gem, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";

const features = ["Luxury concepts", "Guided design flow", "Version-ready foundation"];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-diamond-radial" />
      <div className="container relative grid min-h-screen items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-muted-foreground">
            <Gem className="h-4 w-4 text-diamond-champagne" />
            Private jewelry design studio
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-normal text-white md:text-7xl">
            Design Your Dream Diamond Piece
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
            Create or customize premium diamond jewelry with AI.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/chat">
                Start Designing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/chat?mode=upload">
                <Upload className="h-4 w-4" />
                Upload Existing Design
              </Link>
            </Button>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature} className="bg-white/[0.035]">
                <CardContent className="p-4 text-sm text-muted-foreground">{feature}</CardContent>
              </Card>
            ))}
          </div>
        </section>
        <section className="hidden lg:block">
          <div className="glass-panel rounded-[2rem] border p-4">
            <ImagePlaceholder label="Signature diamond concept" className="aspect-[4/5] rounded-[1.5rem]" />
          </div>
        </section>
      </div>
    </main>
  );
}
