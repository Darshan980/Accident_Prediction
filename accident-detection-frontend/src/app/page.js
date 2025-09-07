'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { Upload, Video, BarChart3, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Accident Detection System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            AI-powered accident detection from live feeds and uploaded videos. 
            Get instant alerts and comprehensive analysis to enhance safety and response times.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/upload" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload size={20} />
              Upload Video
            </Link>
            <Link 
              href="/live" 
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Video size={20} />
              Live Feed
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <Upload className="text-blue-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Video Upload</h3>
            <p className="text-gray-600 mb-6">
              Upload video files to analyze for accidents using our advanced AI algorithms. 
              Support for multiple video formats and batch processing.
            </p>
            <Link 
              href="/upload" 
              className="text-blue-600 font-semibold hover:text-blue-800 transition-colors"
            >
              Start Analyzing →
            </Link>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <Video className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Live Monitoring</h3>
            <p className="text-gray-600 mb-6">
              Real-time accident detection from live camera feeds. 
              Instant notifications and automated alert systems for immediate response.
            </p>
            <Link 
              href="/live" 
              className="text-green-600 font-semibold hover:text-green-800 transition-colors"
            >
              Monitor Live →
            </Link>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
              <BarChart3 className="text-purple-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Analytics & Reports</h3>
            <p className="text-gray-600 mb-6">
              Comprehensive analysis and reporting of detected accidents. 
              Historical data, trends, and insights for better safety management.
            </p>
            <Link 
              href="/results" 
              className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
            >
              View Reports →
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">System Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">99.2%</div>
              <div className="text-gray-600">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">&lt;2s</div>
              <div className="text-gray-600">Response Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-gray-600">Monitoring</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">10K+</div>
              <div className="text-gray-600">Videos Analyzed</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-12 text-gray-900">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
              <h3 className="text-xl font-bold mb-4">Upload or Stream</h3>
              <p className="text-gray-600">Upload video files or connect live camera feeds to our platform</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
              <h3 className="text-xl font-bold mb-4">AI Analysis</h3>
              <p className="text-gray-600">Our advanced AI algorithms analyze the content for accident patterns</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
              <h3 className="text-xl font-bold mb-4">Get Results</h3>
              <p className="text-gray-600">Receive instant notifications and detailed analysis reports</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who trust our AI-powered accident detection system
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/auth?mode=register" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Sign Up Free
            </Link>
            <Link 
              href="/upload" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
