import React from 'react';
import { Link } from 'react-router-dom';

interface RecentBooking {
  _id: string;
  customer: { name: string };
  service: { title: string };
  scheduledDate: string;
  status: string;
  price: { amount: number };
}

interface RecentBookingsTableProps {
  bookings: RecentBooking[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'completed': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ bookings }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-800">Recent Bookings</h2>
      <Link to="/my-bookings" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
        View All
      </Link>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Service</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length > 0 ? bookings.map((booking) => (
            <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4 font-medium text-gray-800">{booking.customer.name}</td>
              <td className="py-4 px-4 text-gray-600">{booking.service.title}</td>
              <td className="py-4 px-4 text-gray-600">{new Date(booking.scheduledDate).toLocaleDateString('en-GB')}</td>
              <td className="py-4 px-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(booking.status)}`}>{booking.status}</span>
              </td>
              <td className="py-4 px-4 font-medium text-gray-800">₹{booking.price.amount}</td>
            </tr>
          )) : (
            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No recent bookings found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);