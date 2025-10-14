// src/pages/AdminReports.tsx
import React from 'react';

/**
 * Component for the Detailed Platform Analytics and Reports page.
 * This is the destination for the "Analytics" quick action button.
 */
export const AdminReports: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900">Platform Analytics & Reports 📈</h1>
                <p className="mt-2 text-lg text-gray-600">Deep dive into revenue, bookings, and user activity.</p>
            </header>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Placeholder for Revenue Chart (Takes 2/3 width) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Monthly Revenue Trend</h2>
                    <div className="h-64 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-400">Placeholder for Revenue Line Chart (e.g., Recharts/Chart.js)</p>
                    </div>
                </div>

                {/* Report Filters/Summary Card (Takes 1/3 width) */}
                <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Report Summary</h2>
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-500">Total Users Grew By</p>
                                <p className="text-2xl font-bold text-blue-600">+12% (Q4)</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-gray-500">Service Completion Rate</p>
                                <p className="text-2xl font-bold text-green-600">92.8%</p>
                            </div>
                        </div>
                    </div>
                    <button 
                        className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={() => alert("Report generation triggered!")}
                    >
                        Generate CSV Report
                    </button>
                </div>

                {/* Placeholder for Bookings/Services Table (Full width) */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Top Performing Services</h2>
                    <div className="h-48 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-400">Placeholder for Data Table (e.g., Service Name, Bookings Count, Rating)</p>
                    </div>
                </div>

            </div>
        </div>
    );
};