'use client'
import { Suspense } from 'react'



export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="w-64 bg-gray-100">Loading sidebar...</div>}>
        <SafeSidebar />
      </Suspense>
      <main className="flex-1 p-6 bg-gray-50">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Accident Detection System</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Suspense fallback={<div className="p-4 border rounded">Loading upload...</div>}>
            <SafeImageUpload />
          </Suspense>
          <Suspense fallback={<div className="p-4 border rounded">Loading feed...</div>}>
            <SafeLiveFeed />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
