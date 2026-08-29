import Image from "next/image";
import ResourceSplit from "./resource-list";
import { Icon } from "./icons";
import { getCourses } from "./data";
import type { Course, Resource } from "./data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = await getCourses();
  return <HomeExperience courses={courses} resources={[]} />;
}

export function HomeExperience({ courses, resources, selectedResource, referralCode }: { courses: Course[]; resources: Resource[]; selectedResource?: Resource; referralCode?: string }) {
  const prompts = resources.filter(r => Boolean(r.content));
  const prompt = selectedResource?.content ? selectedResource : prompts[0] ?? null;
  const sideResources = resources.filter(r => !r.content).sort((a) => a.id === selectedResource?.id ? -1 : 0);

  return (
    <main className="home-page">
      <div className="nav-wrap">
        <nav className="nav shell" aria-label="Main navigation">
          <a className="brand" href="#courses" aria-label="SOAI home"><span className="header-logo"><Image className="brand-logo" src="/brand/logo.webp" alt="School of AI" width={172} height={75} priority /></span><span className="brand-tagline">Creator resources</span></a>
        </nav>
      </div>

      <section className="courses-section" id="courses"><div className="shell">
        <div className="section-heading"><div><span className="section-kicker">DON&apos;T STOP AT THE PROMPT</span><h2>Turn one prompt into a <em>real AI skill.</em></h2></div><p>Copy the free resource, then learn the practical system behind better results with AI.</p></div>
        <div className="course-grid">{courses.map((course, index) => {
          const courseUrl = `https://schoolofai.so/course/${encodeURIComponent(course.slug)}/landing${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`;
          return <a className={`course-card card-${index + 1}`} href={course.isUpcoming ? undefined : courseUrl} aria-disabled={course.isUpcoming || undefined} key={course.id}>
          <div className="course-art">
            <div className={`course-art-media ${course.isUpcoming ? "blurred" : ""}`}>
              {course.thumbnailUrl
                ? <Image src={course.thumbnailUrl} alt="" fill sizes="(max-width: 900px) 100vw, 380px" className="course-thumb" />
                : <div className="art-glyph">{index === 0 ? "✦" : index === 1 ? "⌘" : "↗"}</div>}
            </div>
            {course.isUpcoming && <div className="upcoming-lock"><span className="lock-icon"><Icon name="lock" /></span><strong>Coming soon</strong></div>}
          </div>
          <div className="course-body">
            <h3>{course.title}</h3>
            {!course.isUpcoming && <p className="course-description">{course.description}</p>}
            {course.isUpcoming
              ? <p className="upcoming-note">We&apos;re putting the finishing touches on this course — check back soon.</p>
              : <>
                {course.lessonsCount > 0 && <div className="course-meta"><span><Icon name="book" /> {course.modulesCount} modules</span><span><Icon name="clock" /> {course.lessonsCount} lessons</span></div>}
                <div className="course-footer">
                  {!!course.ratingAvg && <span className="course-rating"><Icon name="star" /> {course.ratingAvg.toFixed(1)}</span>}
                  <span className="explore-link"><span>Explore course</span><span className="round-button"><Icon name="arrow-right" /></span></span>
                </div>
              </>}
          </div>
          </a>;
        })}</div>
      </div></section>

      {selectedResource && <ResourceSplit prompt={prompt} sideResources={sideResources} selectedResource={selectedResource} />}

      {/* <footer className="footer shell"><div className="brand footer-brand"><Image className="brand-logo" src="/brand/logo.webp" alt="School of AI" width={140} height={61} /><span className="brand-tagline">Learn · Create · Grow</span></div><p>Practical AI education for the next generation of creators.</p><p>© {new Date().getFullYear()} SOAI</p></footer> */}
    </main>
  );
}
