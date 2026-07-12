import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Breadcrumb } from "@/app/_components/doc";
import { canonicalUrl } from "@/lib/site";
import { getSundayStats, getTransitionMatrix, getCoachsNotes, getTheShelf, getDeepestVenues } from "@/lib/queries/discoveries";
import { SundayStats } from "./components/sunday-stats";
import { TransitionGraph } from "./components/transition-graph";
import { CoachsNotes } from "./components/coachs-notes";
import { TheShelf } from "./components/the-shelf";
import { DeepestVenues } from "./components/deepest-venues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Oracle | Goose Index",
  description: "Unconventional data analytics and deep discoveries from Goose's history.",
  alternates: { canonical: canonicalUrl("/stats/oracle") },
};

export default async function OraclePage() {
  const [sundayData, transitionData, coachsData, shelfData, venuesData] = await Promise.all([
    getSundayStats(),
    getTransitionMatrix(),
    getCoachsNotes(),
    getTheShelf(),
    getDeepestVenues()
  ]);

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 space-y-24">
      
      {/* Header */}
      <section className="space-y-4 animate-fade-in-up">
        <h1 className="font-display text-4xl sm:text-5xl text-ink">The Oracle</h1>
        <p className="text-muted text-lg max-w-2xl leading-relaxed">
          Unconventional data analytics exploring the band's deepest patterns, hidden flow states, and most profound gaps.
        </p>
      </section>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div>
            <h2 className="font-display text-2xl text-ink mb-2">Never Miss a Sunday Show?</h2>
            <p className="text-muted text-sm max-w-lg">
              Visualizing the average number of extended jams and jamcharts across the days of the week.
            </p>
          </div>
          <SundayStats data={sundayData} />
        </section>

        <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div>
            <h2 className="font-display text-2xl text-ink mb-2">The Shelf</h2>
            <p className="text-muted text-sm max-w-lg">
              Original songs that haven't been played in the longest time. When will they return?
            </p>
          </div>
          <TheShelf data={shelfData} />
        </section>
      </div>

      <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div>
          <h2 className="font-display text-2xl text-ink mb-2">Flow State Matrix</h2>
          <p className="text-muted text-sm max-w-2xl">
            A literal map of the band's musical connections. The thickness of the line represents the frequency of the segue.
          </p>
        </div>
        <TransitionGraph data={transitionData} />
      </section>

      <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <div>
          <h2 className="font-display text-2xl text-ink mb-2">The Deepest Venues</h2>
          <p className="text-muted text-sm max-w-2xl">
            Venues with the highest ratio of jams out of total songs played (min 3 shows).
          </p>
        </div>
        <DeepestVenues data={venuesData} />
      </section>

      <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <div>
          <h2 className="font-display text-2xl text-ink mb-2">From The Coach's Desk</h2>
          <p className="text-muted text-sm max-w-2xl">
            Raw, unfiltered notes and observations pulled directly from official soundboard releases.
          </p>
        </div>
        <CoachsNotes data={coachsData} />
      </section>

    </div>
  );
}
