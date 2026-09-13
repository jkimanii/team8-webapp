import './About.css';

function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>Strathmore Marketplace</h1>
          <p className="hero-lead">
            The secure, campus-scoped online marketplace built specifically for the Strathmore University community and neighboring campuses.
          </p>
        </div>
      </section>

      <section className="about-mission">
        <h2>Trust Through Proximity</h2>
        <div className="mission-grid">
          <article className="mission-card">
            <h3>Why It Exists</h3>
            <p>
              Buying and selling online can often feel risky, impersonal, and inconvenient. Strathmore Marketplace was created to solve these exact issues. By restricting the platform to verified campus communities, we bring trust back to peer-to-peer commerce.
            </p>
          </article>
          <article className="mission-card">
            <h3>Safe Peer-to-Peer Transactions</h3>
            <p>
              Unlike Jiji or Facebook Marketplace where you might deal with complete strangers and arrange risky meetups, here you deal directly with fellow students. Meet up safely at designated locations on campus, inspect items in person, and transact with absolute peace of mind.
            </p>
          </article>
        </div>
      </section>

      <section className="about-steps-section">
        <h2>How It Works</h2>
        <div className="steps-grid">
          <article className="step-card">
            <div className="step-number">1</div>
            <h3>Browse</h3>
            <p>Explore listings uploaded by your peers, from textbooks and electronics to services and campus events.</p>
          </article>
          <article className="step-card">
            <div className="step-number">2</div>
            <h3>Post</h3>
            <p>Have something you no longer need? Snap a photo, add a price, and create a listing in less than two minutes.</p>
          </article>
          <article className="step-card">
            <div className="step-number">3</div>
            <h3>Connect</h3>
            <p>Communicate directly with buyers or sellers on campus, agree on a meetup spot, and close the deal.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

export default About;
