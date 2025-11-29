import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Hyperspeed from "@/components/background/background";

export default function LandingPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Hyperspeed
          effectOptions={{
            distortion: "turbulentDistortion",
            length: 400,
            roadWidth: 10,
            islandWidth: 2,
            lanesPerRoad: 3,
            fov: 90,
            fovSpeedUp: 150,
            speedUp: 2,
            carLightsFade: 0.4,
            totalSideLightSticks: 50,
            lightPairsPerRoadWay: 50,
            colors: {
              roadColor: 0x08_08_08,
              islandColor: 0x0a_0a_0a,
              background: 0x00_00_00,
              shoulderLines: 0x13_13_18,
              brokenLines: 0x13_13_18,
              leftCars: [0xd8_56_bf, 0x67_50_a2, 0xc2_47_ac],
              rightCars: [0x03_b3_c3, 0x0e_5e_a5, 0x32_45_55],
              sticks: 0x03_b3_c3,
            },
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        {/* Hero Text */}
        <div className="mb-16 max-w-4xl text-center">
          <h1 className="mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text font-bold text-6xl text-transparent tracking-tight md:text-7xl lg:text-8xl">
            Transcend Reality
          </h1>
          <p className="mb-4 text-gray-300 text-xl md:text-2xl lg:text-3xl">
            Where artificial intelligence meets infinite possibility
          </p>
          <p className="mx-auto max-w-2xl text-base text-gray-400 md:text-lg">
            Experience the future of conversation. Our AI doesn't just
            respond—it understands, adapts, and evolves with every interaction.
            Break free from limitations and explore the boundless potential of
            truly intelligent dialogue.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Chat Button */}
          <Link
            className="group relative overflow-hidden rounded-2xl bg-linear-to-r from-purple-500/20 to-pink-500/20 p-[2px] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
            href="/chat"
          >
            <div className="relative flex items-center gap-3 rounded-2xl bg-black/40 px-8 py-4 backdrop-blur-xl">
              <span className="font-semibold text-lg text-white">
                Start Chatting
              </span>
              <ArrowRight className="h-5 w-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Expand Limits Button */}
          <Link
            className="group relative overflow-hidden rounded-2xl bg-linear-to-r from-cyan-500/20 to-blue-500/20 p-[2px] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/50"
            href="/payments"
          >
            <div className="relative flex items-center gap-3 rounded-2xl bg-black/40 px-8 py-4 backdrop-blur-xl">
              <span className="font-semibold text-lg text-white">
                Expand Your Limits
              </span>
              <ArrowRight className="h-5 w-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-4">
          {[
            "Powered by Ollama",
            "100% Local",
            "Privacy First",
            "Lightning Fast",
          ].map((feature) => (
            <div
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2 text-gray-300 text-sm backdrop-blur-sm"
              key={feature}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
