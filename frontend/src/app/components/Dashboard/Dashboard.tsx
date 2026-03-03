import React from "react";
import './Dashboard.css'; // Optional if using CSS

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar */}
      <aside className="bg-gray-800 text-white w-full md:w-64 p-4">
        <h2 className="text-xl font-bold mb-4">Dashboard Menu</h2>
        <ul className="space-y-2">
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">Home</li>
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">Analytics</li>
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">Settings</li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Action
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">Total Sales</div>
          <div className="bg-white p-4 rounded shadow">Pending Orders</div>
          <div className="bg-white p-4 rounded shadow">New Users</div>
        </div>

        {/* Placeholder Table */}
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2">001</td>
                <td className="px-4 py-2">John Doe</td>
                <td className="px-4 py-2">Pending</td>
                <td className="px-4 py-2">$120</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2">002</td>
                <td className="px-4 py-2">Jane Smith</td>
                <td className="px-4 py-2">Completed</td>
                <td className="px-4 py-2">$200</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;