// app/upload/components/NavigationLinks.js
const NavigationLinks = () => {
  return (
    <div className="navigation-links">
      <a href="/dashboard" className="nav-link">
        📊 View Dashboard
      </a>
      <a href="/live" className="nav-link">
        📹 Live Detection
      </a>
      <a href="/notification" className="nav-link">
        🔔 Notifications
      </a>

      <style jsx>{`
        .navigation-links {
          text-align: center;
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .nav-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        
        .nav-link:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  )
}

export default NavigationLinks
