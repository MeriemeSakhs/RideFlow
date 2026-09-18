import React from "react";

const StatCard = ({ icon: Icon, label, value, trend, iconBg = "bg-indigo-100", iconColor = "text-indigo-600" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {trend && <p className={`text-xs mt-1 ${trend.startsWith("-") ? "text-red-600" : "text-emerald-600"}`}>{trend}</p>}
    </div>
    {Icon && (
      <div className={`w-11 h-11 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
        <Icon size={20} />
      </div>
    )}
  </div>
);

export default StatCard;
