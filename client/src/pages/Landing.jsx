// =====================================================================
// NEW – the public landing page ("What is CodeMove Kenya?").
// Shown at "/" to EVERYONE (logged in or not). Its buttons lead to /login, or straight to /home when already logged in.
// =====================================================================
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing({ signedIn }) {
  const nav = useNavigate();
  // After "Continue with Google" the browser can come back to "/": send those people on to their dashboard.
  useEffect(() => {
    if (signedIn && sessionStorage.getItem('cm_oauth')) { sessionStorage.removeItem('cm_oauth'); nav('/home', { replace: true }); }
  }, [signedIn, nav]);
  useEffect(() => { document.title = 'CodeMove Kenya – Learn coding and robotics, one lesson at a time'; }, []);

  const go = signedIn ? '/home' : '/login';
  const goLabel = signedIn ? 'Open my dashboard' : 'Start learning';
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-wrap lp-bar">
          <a className="lp-brand" href="#top">CodeMove Kenya</a>
          <nav className="lp-nav" aria-label="Main">
            <a href="#about">About</a><a href="#how">How it works</a><a href="#courses">Courses</a><a href="#faq">FAQ</a>
            <Link className="lp-btn" to={go}>{signedIn ? 'Open my dashboard' : 'Log in'}</Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <div className="lp-hero">
          <div className="lp-wrap">
            <h1>Learn to code and build robots, one lesson at a time.</h1>
            <p>CodeMove Kenya is an online learning platform with short, practical lessons in coding and robotics. Read, try real code in your browser, take quizzes and earn badges, at the pace your teacher sets.</p>
            <div className="lp-cta"><Link className="lp-btn" to={go}>{goLabel}</Link><a className="lp-btn lp-alt" href="#teachers">For teachers</a></div>
          </div>
        </div>

        <section className="lp-sec" id="about">
          <div className="lp-wrap">
            <h2>What is CodeMove Kenya?</h2>
            <p className="lp-lead">It is a learning space built for Kenyan learners who want to understand how technology works by making things with it. You begin with the basics, build real projects such as web pages and Arduino robots, and your teacher can guide the class through the lessons step by step. No earlier experience is needed.</p>
            <ul className="lp-pills"><li>Short lessons</li><li>Learn by doing</li><li>Built-in code editor</li><li>Quizzes and badges</li><li>Teacher-led pace</li></ul>
          </div>
        </section>

        <section className="lp-sec lp-band" id="how">
          <div className="lp-wrap">
            <h2>How it works</h2>
            <p className="lp-lead">Three simple steps from sign-up to your first badge.</p>
            <div className="lp-grid">
              <div className="lp-card"><span className="lp-num">1</span><h3>Join</h3><p>Sign up with your email or your Google account, or let your teacher create your account for you.</p></div>
              <div className="lp-card"><span className="lp-num">2</span><h3>Learn and try</h3><p>Follow clear lessons with pictures and videos, then practise in the code editor and see your work run.</p></div>
              <div className="lp-card"><span className="lp-num">3</span><h3>Show what you know</h3><p>Take quizzes that are marked straight away, earn badges and watch your progress grow on the leaderboard.</p></div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="teachers">
          <div className="lp-wrap">
            <h2>Made for learners and teachers</h2>
            <div className="lp-two">
              <div className="lp-card"><span className="lp-tag">For learners</span>
                <ul><li>Step-by-step lessons with pictures and videos</li><li>Write and run code without installing anything</li><li>Quizzes with instant results</li><li>Badges and a friendly leaderboard</li><li>Your progress is saved so you can continue anytime</li></ul></div>
              <div className="lp-card"><span className="lp-tag">For teachers</span>
                <ul><li>Write lessons in plain text, with no coding needed</li><li>Hide lessons, or schedule when each one opens</li><li>Lock a lesson until you give the class a short code</li><li>Add a whole class at once and follow their progress</li></ul></div>
            </div>
          </div>
        </section>

        <section className="lp-sec lp-band" id="courses">
          <div className="lp-wrap">
            <h2>What you can learn</h2>
            <p className="lp-lead">Lessons open as your teacher releases them, so everyone moves forward together.</p>
            <div className="lp-grid">
              <div className="lp-card"><span className="lp-tag">Course</span><h3>Robotics Foundations</h3><p>Meet the SmartBrains Arduino kit, simulate a circuit in Tinkercad and build a real LED circuit.</p></div>
              <div className="lp-card"><span className="lp-tag">Course</span><h3>Coding Foundations</h3><p>Start with Scratch blocks, then write real HTML and CSS and make your own personal website.</p></div>
              <div className="lp-card"><span className="lp-tag">Project</span><h3>Fire Extinguisher Robotic Car</h3><p>Build a car that finds a flame with a sensor, avoids obstacles and puts the fire out.</p></div>
              <div className="lp-card"><span className="lp-tag">Project</span><h3>Automatic Hand Sanitizer Dispenser</h3><p>Make a touch-free dispenser using an ultrasonic sensor, a servo motor and an Arduino.</p></div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="faq">
          <div className="lp-wrap">
            <h2>Questions people ask</h2>
            <details><summary>Who is CodeMove Kenya for?</summary><p>Anyone who wants to learn coding and robotics from the beginning. Schools, clubs and teachers can also use it to run a class.</p></details>
            <details><summary>Do I need to know anything first?</summary><p>No. The first lessons explain the basics, and each lesson builds on the one before.</p></details>
            <details><summary>Do I need special equipment?</summary><p>The coding lessons only need a phone or computer with internet. The robotics courses use the SmartBrains Arduino kit, and you can begin by simulating circuits online.</p></details>
            <details><summary>Does it work on a phone?</summary><p>Yes. The platform is designed to work on phones, tablets and computers.</p></details>
            <details><summary>Why can’t I see some lessons yet?</summary><p>Your teacher decides when each lesson opens, and may give your class a short code to unlock it. This keeps everyone learning at the same pace.</p></details>
            <details><summary>How do I get started?</summary><p>Press “Start learning”, then sign up with your email or Google account. Teachers can contact us to set up a class.</p></details>
          </div>
        </section>

        <section className="lp-sec lp-final">
          <div className="lp-wrap">
            <h2>Ready to start?</h2>
            <p>Create your account, open your first lesson and build something today. Teachers and schools are welcome to get in touch.</p>
            <Link className="lp-btn" to={go}>{goLabel}</Link>
            {/* Contact address: change it here if different */}
            <p className="lp-contact"><a href="mailto:amanyaabdillahi7@gmail.com">amanyaabdillahi7@gmail.com</a></p>
          </div>
        </section>
      </main>

      <footer className="lp-footer"><div className="lp-wrap">© 2026 CodeMove Kenya. Learn, build, move forward.</div></footer>
    </div>
  );
}
