import React from 'react';
import { Link } from 'react-router-dom';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  color: string;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ actions }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
    <h2 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Link
          key={index}
          to={action.link}
          className={`${action.color} text-white p-6 rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-1 group`}
        >
          <div className="flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">{action.icon}</div>
          <h3 className="font-semibold text-center mb-2">{action.title}</h3>
          <p className="text-sm opacity-90 text-center">{action.description}</p>
        </Link>
      ))}
    </div>
  </div>
);