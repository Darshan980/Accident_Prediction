//src/app/layout.js
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from './contexts/AuthContext'
import ClientLayout from './ClientLayout'

export const metadata = {
  title: 'Accident Detection App',
  description: 'AI-powered accident detection from live feed and uploaded video',
}

// Main Layout Component (Server Component)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Additional meta tags */}
        <Script src="/../js/notifications.js" strategy="beforeInteractive" />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          /* Focus styles */
          button:focus,
          input:focus,
          a:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
          }
        `}</style>
      </head>
      <body>
        <AuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}